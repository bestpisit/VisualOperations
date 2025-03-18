'use client';
import React from 'react';
import { useRouter } from 'next-nprogress-bar';
import { ProjectCardType } from './ProjectCardType';
import { getColorFromString } from '@/lib/utility/colorGenerator';
import { ROUTES } from '@/lib/route';

const ProjectCard = ({ id, name, description, uuid }: ProjectCardType) => {
    const router = useRouter();

    return (
        <div key={id} className={`w-64 h-64 bg-white shadow-lg shadow-${getColorFromString(uuid)} hover:shadow-secondary-200 transition-all rounded-lg p-4 pb-2 flex flex-col justify-between item-center`}>
            <div className='border-b pb-2'>
                <h2 className="font-bold text-lg text-gray-800">{name}</h2>
                <p className="text-gray-500 mt-2 text-sm">{uuid}</p>
            </div>
            <div className='flex-grow mt-2'>
                <p className="text-gray-500">{description}</p>
            </div>
            <div className="flex justify-between items-center pt-2 mt-2">
                <button
                    className="text-secondary-100 font-bold ml-auto flex items-center bg-secondary-300 hover:bg-secondary-400 transition-all p-2 rounded-md"
                    onClick={() => router.push(ROUTES.PROJECT(uuid))}
                >
                    Details
                </button>
            </div>
            <div className="hidden">
                shadow-pink-400
                shadow-yellow-400
                shadow-lime-400
                shadow-teal-400
                shadow-blue-400
                shadow-purple-400
                shadow-orange-400
                shadow-red-400
                shadow-green-400
                shadow-cyan-400
                shadow-amber-400
                shadow-emerald-400
                shadow-fuchsia-400
                shadow-rose-400
                hadow-sky-400
                shadow-violet-400
                shadow-indigo-400
            </div>
        </div>
    );
};

export default ProjectCard;
