import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const prisma = globalForPrisma.prisma || new PrismaClient()
// .$extends({
//     query: {
//         resourceDependency: {
//             async create({ args, query }) {
//                 const { dependentId, dependencyId } = args.data;

//                 if (!dependentId || !dependencyId) {
//                     throw new Error('Both dependentId and dependencyId are required.');
//                 }

//                 if (dependentId === dependencyId) {
//                     throw new Error('A resource cannot depend on itself.');
//                 }

//                 const hasCycle = await checkCircularDependency(dependentId, dependencyId);
//                 if (hasCycle) {
//                     throw new Error('Circular dependency detected! This dependency cannot be created.');
//                 }

//                 return query(args);
//             },
//             async update({ args, query }) {
//                 const dependentId = typeof args.data.dependentId === 'object'
//                     ? args.data.dependentId.set
//                     : args.data.dependentId;

//                 const dependencyId = typeof args.data.dependencyId === 'object'
//                     ? args.data.dependencyId.set
//                     : args.data.dependencyId;

//                 if (dependentId && dependencyId) {
//                     if (dependentId === dependencyId) {
//                         throw new Error('A resource cannot depend on itself.');
//                     }

//                     const hasCycle = await checkCircularDependency(dependentId, dependencyId);
//                     if (hasCycle) {
//                         throw new Error('Circular dependency detected! This update cannot be applied.');
//                     }
//                 }

//                 return query(args);
//             },
//         },
//     },
// });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export async function checkResourceCircularDependency(dependentId: string, dependencyId: string): Promise<boolean> {
    // Step 1: Fetch only relevant dependencies instead of the entire table
    const relevantDependencies = await prisma.resourceDependency.findMany({
        where: {
            OR: [{ dependentId }, { dependencyId }],
        },
        select: { dependentId: true, dependencyId: true },
    });

    // Step 2: Convert result into an adjacency list (Graph)
    const dependencyGraph = new Map<string, string[]>();

    relevantDependencies.forEach(({ dependentId, dependencyId }) => {
        if (!dependencyGraph.has(dependentId)) {
            dependencyGraph.set(dependentId, []);
        }
        dependencyGraph.get(dependentId)?.push(dependencyId);
    });

    // Step 3: Perform iterative DFS to detect cycles
    const visited = new Set<string>();
    const stack = [dependencyId];

    while (stack.length > 0) {
        const current = stack.pop();
        if (!current) continue;

        if (current === dependentId) return true; // Cycle detected
        if (visited.has(current)) continue; // Already processed

        visited.add(current);

        const nextDependencies = dependencyGraph.get(current) || [];
        stack.push(...nextDependencies);
    }

    return false; // No cycle found
}

export default prisma