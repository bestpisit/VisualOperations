import ImageInventoryManager from "@/images/ImageInventoryManager";
import prisma from "@/lib/prisma";
import { DeploymentTemplate, TerraformOutput } from "@/types/PlatformStructure";
import { Project } from "@prisma/client";

export interface VisualizationNode {
    data: {
        id: string;
        label: string;
        description?: string;
        parent?: string;
        img?: string;
        color?: string;
    };
    classes: string; // 'group' | 'parent' | 'node'
}

const colorPalette = [
    "#7ed957", // depth 0
    "#0cc0df", // depth 1
    "#FFB74D", // depth 2
    "#37a6c8", // depth 3
    // etc. – add as many as you like
];

function getColorByDepth(depth: number) {
    return colorPalette[depth % colorPalette.length]; // Wrap if depth > colors available
}

export const generateVisualizationData = async (projectUUID: Project["uuid"]) => {
    // 1) Build up the raw elements array (groups, parents, nodes).
    //    Same logic as before, but we won't finalize the sort right away.
    const elements: VisualizationNode[] = [];

    // Fetch resources
    const resources = await prisma.resource.findMany({
        where: {
            deployment: {
                projectId: projectUUID,
            },
        },
        include: {
            deployment: {
                select: {
                    template: {
                        select: {
                            details: true,
                            name: true,
                        },
                    },
                },
            },
            dependents: true,   // resources that *this* depends on
            dependencies: true, // resources that depend on *this*
        },
    });

    if (resources.length === 0) {
        return elements;
    }

    // 1a) Build a map of node data for each resource
    const nodeDataMap = new Map<string, VisualizationNode["data"]>();

    for (const resource of resources) {
        // Extract an image from the template
        const templateDetails = resource.deployment.template.details as unknown as DeploymentTemplate;
        const imageUrl = ImageInventoryManager.getImageUrl(
            templateDetails?.imageKey?.[0] || "Terraform"
        );

        const resourceDetails = resource.details as unknown as TerraformOutput;
        nodeDataMap.set(resource.uuid, {
            id: resource.uuid,
            label: resource.name,
            description:
                resource.deployment.template.name +
                "\n" +
                (resourceDetails["endpoint"]?.value || ""),
            img: imageUrl
        });
    }

    // 1b) Determine which are group nodes vs parent nodes, etc.
    const groupIds: string[] = [];
    const parentIds = new Set<string>();

    for (const resource of resources) {
        const childRelations = resource.dependencies; // children of this resource

        if (childRelations.length > 0) {
            // We treat anything with children as at least a 'parent'
            parentIds.add(resource.uuid);

            // If we want to treat that resource as "group" as well, store in groupIds
            // This is purely up to your logic: here, we assume that if it has children,
            // we also label it as a group. Or you might do a check like
            // if (resource.name.startsWith('group-')) ...
            if (!groupIds.includes(resource.uuid)) {
                groupIds.push(resource.uuid);
            }
        }
    }

    // 1c) Create "group" elements for each groupId
    for (const groupId of groupIds) {
        // Optionally figure out if this group also has a parent group
        // For example, you might look at the resource’s own dependencies or dependents
        const thisResource = resources.find((r) => r.uuid === groupId);
        // If this resource depends on something that’s also a group, you might nest it
        // but for clarity, let’s look at whether this *resource* has a "parent group."
        let parentGroupId: string | undefined;

        // If the group resource depends on exactly one other resource that is also a group,
        // we can nest it under that group.
        // (Adjust logic as needed for your data model.)
        if (thisResource?.dependents?.length) {
            const maybeParent = thisResource.dependents[0].dependencyId;
            if (groupIds.includes(maybeParent)) {
                parentGroupId = maybeParent;
            }
        }

        elements.push({
            data: {
                id: "group-" + groupId,
                label: "group-" + groupId,
                color: "#7ed957",
                ...(parentGroupId ? { parent: "group-" + parentGroupId } : {}),
            },
            classes: "group",
        });
    }

    // 1d) Create the parent/node resource elements
    for (const resource of resources) {
        const data = nodeDataMap.get(resource.uuid);
        if (!data) continue;

        // Default to "node"
        let classes = "node";

        // If it has children, label as "parent"
        if (parentIds.has(resource.uuid)) {
            classes = "parent";
        }

        // If we flagged it as a group, nest it inside its own group-… element.
        // i.e. "group-cm84mojrq..." is the parent of this resource
        if (groupIds.includes(resource.uuid)) {
            data.parent = "group-" + resource.uuid;
        } else {
            // For a resource that is not a top-level group, see if it has a parent group
            // Typically you'd do: childData.parent = "group-" + [the resource's parent's ID].
            // In your code, you used:
            if (resource.dependents.length > 0) {
                // The resource depends on something else, so we nest it under that parent's group
                const parentId = resource.dependents[0].dependencyId;
                if (parentId && groupIds.includes(parentId)) {
                    data.parent = "group-" + parentId;
                }
            }
        }

        elements.push({ data, classes });
    }

    // 2) Build a BFS ordering based on the final hierarchy:
    //    BFS from the top-level groups (where `!data.parent`) and traverse downward.
    const bfsSorted = bfsOrder(elements);

    // 6) Assign depth-based colors after sorting
    const groupDepth = new Map<string, number>();
    const queue: string[] = [];

    for (const el of bfsSorted) {
        if (el.classes === "group" && !el.data.parent) {
            queue.push(el.data.id);
            groupDepth.set(el.data.id, 0); // Top-level groups start at depth 0
        }
    }

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentDepth = groupDepth.get(currentId) || 0;

        // Find children
        for (const el of bfsSorted) {
            if (el.data.parent === currentId && el.classes === "group") {
                if (!groupDepth.has(el.data.id)) {
                    groupDepth.set(el.data.id, currentDepth + 1);
                    queue.push(el.data.id);
                }
            }
        }
    }

    // Apply colors
    for (const el of bfsSorted) {
        if (el.classes === "group") {
            const depth = groupDepth.get(el.data.id) ?? 0;
            el.data.color = getColorByDepth(depth);
        }
    }

    // 3) Return your BFS-sorted array
    return bfsSorted;
};

/**
 * Perform a breadth-first sort of the elements based on their parent->child relationships.
 *  - We treat each `element.data.id` as a node in a graph,
 *  - `element.data.parent` indicates a parent node's ID,
 *  - We'll invert that relationship so we can do child lookups easily.
 */
function bfsOrder(elements: VisualizationNode[]): VisualizationNode[] {
    // 2a) Build adjacency from each element.id -> array of immediate children
    const adjacency = new Map<string, VisualizationNode[]>();

    for (const el of elements) {
        const parentId = el.data.parent;
        if (parentId) {
            // That means el is a child of parentId
            const children = adjacency.get(parentId) || [];
            children.push(el);
            adjacency.set(parentId, children);
        }
    }

    // 2b) Find all top-level elements (i.e. have no parent)
    const topLevel = elements.filter((el) => !el.data.parent);

    // We’ll BFS from each top-level node (especially top-level groups).
    // If you have multiple top-level groups, we'll queue them in ascending order by ID for consistent output.
    topLevel.sort((a, b) => a.data.id.localeCompare(b.data.id));

    const visited = new Set<string>();
    const sorted: VisualizationNode[] = [];
    const queue = [...topLevel];

    // 2c) BFS traversal
    while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current.data.id)) continue;

        visited.add(current.data.id);
        sorted.push(current);

        // Get children in sorted order
        const children = adjacency.get(current.data.id) || [];
        children.sort((a, b) => a.data.id.localeCompare(b.data.id));

        for (const child of children) {
            if (!visited.has(child.data.id)) {
                queue.push(child);
            }
        }
    }

    // 2d) If any elements are still unvisited (e.g. orphan nodes with no parent),
    //     run BFS from them too so they appear in the final output.
    for (const el of elements) {
        if (!visited.has(el.data.id)) {
            // BFS from this node
            const queue2 = [el];
            while (queue2.length > 0) {
                const node = queue2.shift()!;
                if (visited.has(node.data.id)) continue;

                visited.add(node.data.id);
                sorted.push(node);

                const children = adjacency.get(node.data.id) || [];
                children.sort((a, b) => a.data.id.localeCompare(b.data.id));
                for (const child of children) {
                    if (!visited.has(child.data.id)) {
                        queue2.push(child);
                    }
                }
            }
        }
    }

    return sorted;
}
