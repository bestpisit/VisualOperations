import { PlusCircle, ZoomIn } from 'lucide-react';
import Visualization from '@/components/visualization/Visualization';
import { generateVisualizationData } from '@/lib/utility/visualization/VisualizationUtility';

export const dynamic = "force-dynamic";

// Dynamically import the CytoscapeDiagram component
// const DynamicCytoscapeDiagram = dynamic(() => import('@/components/visualization/CytoscapeDiagram'), {
//     loading: () => <p>Loading diagram...</p>,
//     ssr: false,
// });

export default async function ProjectVisualization({
    params,
}: {
    params: { uuid: string };
}) {
    const elements = await generateVisualizationData(params.uuid);

    return (
        <div className='border-l flex-grow flex flex-col'>
            <div className="bg-slate-50 px-4 py-2 flex justify-start items-center space-x-4 border-b">
                <button
                    className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 transition duration-200"
                >
                    <PlusCircle className="w-5 h-5" />
                    <span>Create Resource</span>
                </button>
                <button
                    className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 transition duration-200"
                >
                    <ZoomIn className="w-5 h-5" />
                    <span>Zoom To Fit</span>
                </button>
            </div>
            <div className="flex-grow bg-white shadow-inner relative">
                <Visualization elements={elements} projectUUID={params.uuid} />
            </div>
        </div>
    );
};