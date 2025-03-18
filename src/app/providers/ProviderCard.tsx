'use client';

import { ROUTES } from "@/lib/route";
import { useRouter } from "next-nprogress-bar";

export interface ProjectCardType {
    id: number;
    name: string;
    description: string;
}

const ProviderCard = ({ id, name, description }: ProjectCardType) => {
    const router = useRouter();

    return (
        <div className="w-64 h-64 bg-white shadow-lg rounded-lg p-4 pb-2 flex flex-col justify-between item-center">
            <div>
                <h2 className="font-bold text-lg text-gray-800 mb-10">Provider {'#'+id}</h2>
                <h2 className="font-bold text-lg text-gray-800">{name}</h2>
                <p className="text-gray-500 mt-2">{description}</p>
            </div>
            <div className="flex justify-between items-center border-t pt-2 mt-2">
                <button
                    className="text-secondary-100 font-bold ml-auto flex items-center bg-secondary-300 hover:bg-secondary-400 transition-colors p-2 rounded-md"
                    onClick={() => router.push(ROUTES.PROVIDER(name))}
                >
                    Details
                </button>
            </div>
        </div>
    );
};

export default ProviderCard;
