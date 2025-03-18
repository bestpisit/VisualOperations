'use client';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

// Dynamically import the CytoscapeDiagram component
const DynamicCytoscapeDiagram = dynamic(() => import('@/components/visualization/CytoscapeDiagram'), {
    loading: () => <p>Loading diagram...</p>,
    ssr: false,
});

export default function ProjectVisualizationPage() {
    const { version } = useParams() || {};
    // const elements = [
    //     { data: { id: 'vm-gateway', label: 'vm-gateway', description: '10.10.183.23' }, classes: 'group' },
    //     { data: { id: '1', label: 'Nginx', description: 'demo.visops.pimandek.ac.th', parent: 'vm-gateway', img: '/nginx.png' }, classes: 'node' },
    //     { data: { id: 'e1-2', source: '1', target: '2', label: 'Reverse Proxy', color: '#FF9800' } },
    //     { data: { id: 'vm-visops', label: 'vm-visops', description: '10.10.188.248' }, classes: 'group' },
    //     { data: { id: 'vm-database', label: 'vm-database', description: '10.10.188.15' }, classes: 'group' },
    //     { data: { id: '2', label: 'Visops Platform', description: 'visops:3000', parent: 'vm-visops', img: '/docker.png' }, classes: 'node' },
    //     { data: { id: '5', label: 'Redis', description: 'redis:6379', parent: 'vm-database', img: '/redis-icon.svg' }, classes: 'node' },
    //     { data: { id: '7', label: 'PostgreSQL', description: 'postgres:5432', parent: 'vm-database', img: '/postgresql.png' }, classes: 'node' },
    //     { data: { id: 'e2-RedisHA', source: '2', target: '5', label: 'External Caching', color: '#FF4081' } },
    //     { data: { id: 'e2-DatabaseHA', source: '2', target: '7', label: 'External Database', color: '#4CAF50' } },
    // ];
    const elements = [
        { data: { id: 'vm-todo', label: 'vm-todo', description: '10.10.188.43' }, classes: 'group' },
        { data: { id: '1', label: 'Nginx', description: 'todo.pimandek.ac.th', parent: 'vm-gateway', img: '/nginx.png' }, classes: 'node' },
        { data: { id: 'e1-2', source: '1', target: '2', label: 'Reverse Proxy', color: '#FF9800' } },
        { data: { id: 'vm-gateway', label: 'vm-gateway', description: '10.10.188.23' }, classes: 'group' },
        { data: { id: '2', label: 'Todo Application', description: 'todo:3000', parent: 'vm-todo', img: '/docker.png' }, classes: 'node' },
        { data: { id: '7', label: 'MySQL', description: 'mysql:3306', parent: 'vm-todo', img: '/mysql.png' }, classes: 'node' },
        { data: { id: 'e2-DatabaseHA', source: '2', target: '7', label: 'Data Storing', color: '#4CAF50' } },
    ];
    return (
        <div className='border-l flex-grow flex flex-col'>
            <div className="bg-slate-50 px-4 py-2 flex justify-start items-center space-x-4 border-b">
                Version 
                <span className='ml-2 p-2 bg-indigo-600 text-white font-bold rounded-lg'>
                    {version}
                </span>
            </div>
            <div className="flex-grow">
                <DynamicCytoscapeDiagram elements={elements} />
            </div>
        </div>
    );
};