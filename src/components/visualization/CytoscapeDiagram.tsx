'use client';
import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { ROUTES } from '@/lib/route';
import { useRouter } from 'next-nprogress-bar';
import { useParams } from 'next/navigation';

cytoscape.use(dagre);

interface CytoscapeDiagramProps {
    elements: cytoscape.ElementDefinition[]; // Accepts dynamic elements
}

const CytoscapeDiagram: React.FC<CytoscapeDiagramProps> = ({ elements }) => {
    const router = useRouter();
    const {uuid} = useParams();
    const cyRef = useRef<HTMLDivElement>(null);
    const cyInstanceRef = useRef<cytoscape.Core | null>(null); // Reference to cytoscape instance

    useEffect(() => {
        if (!cyRef.current) return;

        // Initialize Cytoscape if not already initialized
        if (!cyInstanceRef.current) {
            const cy = cytoscape({
                container: cyRef.current,
                elements: elements,
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#FFFFFF',
                            'shape': 'roundrectangle',
                            'width': '100px',
                            'height': '100px',
                            'label': 'data(label)',
                            'text-valign': 'bottom',
                            'text-halign': 'center',
                            'background-image': 'data(img)',
                            'background-fit': 'contain',
                            'background-clip': 'none',
                            'font-size': '12px',
                            'font-weight': 'bold',
                        },
                    },
                    {
                        selector: 'node.group',
                        style: {
                            'background-color': '#E3F2FD',
                            'shape': 'roundrectangle',
                            'label': 'data(label)',
                            'text-valign': 'top',
                            'text-halign': 'center',
                            'font-size': '16px',
                            'font-weight': 'bold',
                            'border-width': '2px',
                            'border-color': '#90CAF9',
                        },
                    },
                    {
                        selector: ':parent',
                        style: {
                            'text-valign': 'top',
                            'text-halign': 'center',
                        },
                    },
                    {
                        selector: 'edge',
                        style: {
                            'text-margin-y': -10, // Adjusts the vertical position of labels to avoid overlapping lines
                            'curve-style': 'taxi', // For orthogonal (right-angled) lines
                            'taxi-direction': 'auto',
                            'target-arrow-shape': 'triangle',
                            'label': 'data(label)',
                            'font-size': '10px',
                            'text-wrap': 'wrap', // Ensures labels wrap if they are too long
                            'width': 3,
                            'line-color': 'data(color)',
                            'target-arrow-color': 'data(color)',
                        },
                    },
                    {
                        // Styling for displaying the description under the label
                        selector: 'node, node.group',
                        style: {
                            'content': 'data(label)',
                            'text-valign': 'center',
                            'text-halign': 'center',
                        },
                    },
                    {
                        selector: 'node, node.group',
                        style: {
                            'text-valign': 'top',
                            'text-margin-y': 0,  // Move the description below the label
                            'text-halign': 'center',
                            'content': (ele: any) => {
                                const label = ele.data('label') || '';
                                const description = ele.data('description') || '';
                                return `${label}\n${description}`;
                            },
                            'font-size': '10px',
                            'color': '#000000',
                            'text-wrap': 'wrap',  // Enable text wrapping
                            'text-max-width': '80px',  // Max width for wrapping
                            'height': (ele: any) => {
                                const label = ele.data('label') || '';
                                const description = ele.data('description') || '';
                                // Adjust height based on content length
                                return (label.length + description.length) > 20 ? '150px' : '100px';
                            },
                            'width': '100px',  // Set width for consistency
                        },
                    }
                ],
                layout: {
                    name: 'dagre',
                    rankDir: 'LR', // Top to bottom layout direction
                    nodeSep: 50,
                    edgeSep: 10,
                    rankSep: 100,
                    avoidOverlap: true,
                } as any,
                zoomingEnabled: true,
                userZoomingEnabled: true,
                minZoom: 0.5,
                maxZoom: 2.5,
                panningEnabled: true,
                userPanningEnabled: true,
                boxSelectionEnabled: true,
                wheelSensitivity: 0.1,
            });

            cyInstanceRef.current = cy; // Store cytoscape instance reference

            // Adjust the viewport to fit the graph
            cy.fit(undefined, 50);
            cy.center();

            // Double-click event to navigate
            let tappedBefore: null;
            let tappedTimeout: number | undefined;

            cy.on('tap', function (event) {
                const tappedNow = event.target;
                if (tappedTimeout && tappedBefore) {
                    clearTimeout(tappedTimeout as number);
                }
                if (tappedBefore === tappedNow) {
                    tappedBefore = null;
                    if (tappedNow.isNode() && !tappedNow.isParent()) {
                        const key = tappedNow.id();
                        const projectId = uuid as string;
                        if (projectId) {
                            router.push(`${ROUTES.PROJECT_RESOURCE(projectId, key)}`);
                        }
                    }
                } else {
                    tappedBefore = tappedNow;
                    tappedTimeout = setTimeout(() => {
                        tappedBefore = null;
                    }, 300) as unknown as number;
                }
            });

            cy.on('tap', 'node', (event) => {
                if (event.originalEvent.ctrlKey) {
                    const node = event.target;
                    const description = node.data('description');
                    if (description) {
                        window.open(`http://${description}`, '_blank');
                    }
                }
            });
        } else {
            // If Cytoscape is already initialized, just update the elements
            const cy = cyInstanceRef.current;
            cy.json({ elements }); // Update diagram elements dynamically
            cy.fit(undefined, 50); // Refitting the diagram after update
        }

        // Cleanup Cytoscape instance on unmount
        return () => {
            if (cyInstanceRef.current) {
                cyInstanceRef.current.destroy();
                cyInstanceRef.current = null;
            }
        };
    }, [elements, router]);

    return <div ref={cyRef} className="w-full h-full" />;
};

export default CytoscapeDiagram;
