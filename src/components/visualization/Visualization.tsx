'use client';
import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import klay from 'cytoscape-klay';
import { ROUTES } from '@/lib/route';
import { Project } from '@prisma/client';
import { useRouter } from 'next-nprogress-bar';
import { useParams } from 'next/navigation';
import { Move } from 'lucide-react';

// Register klay
cytoscape.use(klay);

interface VisualizationProps {
    elements: cytoscape.ElementDefinition[];
    projectUUID: Project['uuid'];
}

const Visualization: React.FC<VisualizationProps> = ({ elements, projectUUID }) => {
    const router = useRouter();
    const { uuid } = useParams();
    const cyRef = useRef<HTMLDivElement>(null);
    const cyInstanceRef = useRef<cytoscape.Core | null>(null);

    // Function to fit elements within the view
    const zoomToFit = () => {
        if (cyInstanceRef.current) {
            cyInstanceRef.current.fit(undefined, 50); // 50 is padding
        }
    };

    useEffect(() => {
        if (!cyRef.current) return;

        // If not initialized, create a new Cytoscape instance
        if (!cyInstanceRef.current) {
            const cy = cytoscape({
                container: cyRef.current,
                elements,
                style: [
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#FFFFFF',
                            'shape': 'roundrectangle',
                            'width': '300px',  // Dynamic width based on text
                            'height': 'label', // Dynamic height based on text
                            'label': 'data(label)',
                            'text-valign': 'center',
                            'text-halign': 'left',
                            'text-margin-x': 300,
                            'background-width': '40px',  // Fixed image size
                            'background-height': '40px',
                            'font-weight': 'normal',
                            'content': (ele: cytoscape.NodeSingular) => {
                                const label = ele.data('label') || '';
                                const description = ele.data('description') || '';
                                return `${label}\n${description}`;
                            },
                            'font-size': '18px',
                            'color': '#3498db',
                            'text-wrap': 'wrap',
                            'font-family': 'Prompt, sans-serif',
                            'padding-top': '10px', // Add padding for better text spacing
                            'border-width': 1,
                            'border-color': '#cbc8c8',
                            'line-height': 1.5,
                        },
                    },
                    {
                        selector: 'node.parent',
                        style: {
                            'background-color': '#FFFFFF',
                            'shape': 'roundrectangle',
                            'width': '300px',  // Dynamic width based on text
                            'height': 'label', // Dynamic height based on text
                            'label': 'data(label)',
                            'text-valign': 'center',
                            'text-halign': 'left',
                            'text-margin-x': 300,
                            'background-width': '40px',  // Fixed image size
                            'background-height': '40px',
                            'font-weight': 'normal',
                            'content': (ele: cytoscape.NodeSingular) => {
                                const label = ele.data('label') || '';
                                const description = ele.data('description') || '';
                                return `${label}\n${description}`;
                            },
                            'font-size': '18px',
                            'color': '#3498db',
                            'text-wrap': 'wrap',
                            'font-family': 'Prompt, sans-serif',
                            'padding-top': '10px', // Add padding for better text spacing
                            'border-width': 0,
                            'border-color': '#0cc0df',
                            'border-style': 'dashed',
                            'line-height': 1.5,
                        },
                    },
                    {
                        selector: 'node.group',
                        style: {
                            'background-color': '#FFFFFF',
                            'shape': 'roundrectangle',
                            'font-size': 0,
                            'border-width': '2px',
                            'border-color': 'data(color)',
                            "padding-top": "20px",
                            'border-style': 'dashed',
                            'border-opacity': 0.5,
                        },
                    },
                    {
                        selector: '[img]', // 👈 Only applies if `img` is defined
                        style: {
                            'background-image': 'data(img)',
                            'background-fit': 'contain',
                            'background-position-x': 5,  // Position image to the left
                        },
                    },
                    {
                        selector: 'edge',
                        style: {
                            'curve-style': 'taxi',
                            'border-style': 'dotted',
                            "border-width": 10,
                            'taxi-direction': 'auto',
                            'target-arrow-shape': 'triangle',
                            'label': 'data(label)',
                            'font-size': '10px',
                            'width': 3,
                            'line-color': 'data(color)',
                            'target-arrow-color': 'data(color)',
                        },
                    },
                ],
                layout: {
                    name: 'klay',
                    nodeDimensionsIncludeLabels: true, // So node sizes consider label dimensions
                    fit: true,
                    padding: 50,
                    klay: {
                        // Klay-specific options:
                        layoutHierarchy: true,  // This is important for nested compound nodes
                        spacing: 10,
                        direction: 'RIGHT', // or 'DOWN' if you want a top-to-bottom layout
                        // more klay config if needed
                    },
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

            cyInstanceRef.current = cy;

            // Optional: Double-click logic
            let tappedBefore: cytoscape.EventObject | null = null;
            let tappedTimeout: number | undefined;

            cy.on('tap', function (event) {
                const tappedNow = event.target;
                if (tappedTimeout && tappedBefore) {
                    clearTimeout(tappedTimeout);
                }
                if (tappedBefore === tappedNow) {
                    tappedBefore = null;
                    if (tappedNow.isNode && !tappedNow.isParent()) {
                        const key = tappedNow.id();
                        const projectId = uuid as string;
                        if (projectId) {
                            router.push(`${ROUTES.PROJECT_RESOURCE(projectId, key)}`);
                        }
                    }
                } else {
                    tappedBefore = tappedNow;
                    tappedTimeout = window.setTimeout(() => {
                        tappedBefore = null;
                    }, 300);
                }
            });

            // Optional: Ctrl + click to open details
            cy.on('tap', 'node', (event) => {
                if (event.originalEvent.ctrlKey) {
                    const node = event.target;
                    const id = node.data('id');
                    if (id) {
                        window.open(ROUTES.PROJECT_RESOURCE_DETAILS(projectUUID, id), '_blank');
                    }
                }
            });
        } else {
            // If Cytoscape already initialized, just update the elements
            const cy = cyInstanceRef.current;
            cy.json({ elements });
            // cy.layout({
            //     name: 'klay',
            //     nodeDimensionsIncludeLabels: true,
            //     fit: true,
            //     padding: 50,
            //     klay: {
            //         layoutHierarchy: true,
            //         spacing: 40,
            //         direction: 'RIGHT',
            //     },
            // }).run();
            cy.fit(undefined, 50);
        }

        // Cleanup on unmount
        return () => {
            if (cyInstanceRef.current) {
                cyInstanceRef.current.destroy();
                cyInstanceRef.current = null;
            }
        };
    }, [elements, router, uuid, projectUUID]);

    return (
        <>
        <div className='absolute bottom-0 right-0 bg-transparent z-10 m-5'>
            <Move onClick={zoomToFit} className='w-10 h-10 text-secondary-250 hover:rotate-45 transition-all active:scale-125' />
        </div>
            <div ref={cyRef} className="w-full h-full" onDoubleClick={zoomToFit} />
        </>
    );
};

Visualization.displayName = 'Visualization';

export default Visualization;
