'use client';
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next-nprogress-bar';
import ImageInventoryManager from '@/images/ImageInventoryManager';

interface TemplateCardProps {
    title: string;
    provider: string;
    type: string;
    description: string;
    projectName?: string | null;
    imageKey?: string[]; // Use keys from ImageInventory.Icon
    templateName: string;
    category: string;
    subcategory: string;
    templateId: string;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
    title,
    provider,
    type,
    description,
    imageKey,
    templateId
}) => {
    const router = useRouter();

    const handleCreate = () => {
        const url = `/templates/${templateId}`;
        router.push(url);
    };

    return (
        <div className="w-64 bg-white shadow-lg rounded-lg p-4 flex flex-col justify-between">
            {/* Card Content */}
            <div>
                {/* Logo */}
                <div className='flex gap-4'>
                    {
                        typeof imageKey !== 'string' && imageKey?.map((image, ind) => (
                            <div className="w-10 h-10 mb-4" key={ind}>
                                <Image
                                    key={ind}
                                    src={ImageInventoryManager.getImageUrl(image)}
                                    alt={`${title} Logo`}
                                    width={40}
                                    height={40}
                                />
                            </div>
                        ))
                    }

                    {
                        typeof imageKey === 'string' &&
                        <div className="w-10 h-10 mb-4">
                            <Image
                                src={ImageInventoryManager.getImageUrl(imageKey)}
                                alt={`${title} Logo`}
                                width={40}
                                height={40}
                            />
                        </div>
                    }
                </div>

                {/* Title */}
                <h2 className="font-bold text-lg text-gray-800">{title}</h2>

                {/* Provider */}
                <p className="text-gray-600">{provider}</p>

                {/* Type */}
                <p className="text-gray-600">{type}</p>

                {/* Description */}
                <p className="text-gray-500 mt-2">{description}</p>
            </div>

            {/* Card Footer */}
            <div className="flex justify-between items-center border-t pt-4 mt-4">
                {/* Create Button */}
                <button
                    className="text-blue-500 font-semibold flex items-center"
                    onClick={handleCreate}
                >
                    Create <span className="ml-1">&#9660;</span>
                </button>

                {/* Favorite Icon */}
                {/* <button className="text-blue-500">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill={false ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        />
                    </svg>
                </button> */}
            </div>
        </div>
    );
};

export default TemplateCard;
