'use client';

import React from 'react';

interface TemplateSidebarProps {
    categories: string[];
    subcategories: Record<string, string[]>;
    selectedCategory: string;
    selectedSubCategory: string;
    setSelectedCategory: (category: string) => void;
    setSelectedSubCategory: (subCategory: string) => void;
}

const TemplateSidebar: React.FC<TemplateSidebarProps> = ({
    categories,
    subcategories,
    selectedCategory,
    selectedSubCategory,
    setSelectedCategory,
    setSelectedSubCategory,
}) => {
    return (
        <div className="w-full bg-white p-4 overflow-auto shadow-inner h-full">
            {/* All Categories */}
            <div className="mb-6 text-md">
                <h2 className="font-bold text-gray-700 mb-2">Categories</h2>
                <ul className="flex flex-col gap-2">
                    <li
                        className={`text-gray-600 cursor-pointer hover:text-indigo-500 break-words ${selectedCategory === 'All' ? 'font-bold text-indigo-500' : ''
                            }`}
                        onClick={() => {
                            setSelectedCategory('All');
                            setSelectedSubCategory('');
                        }}
                    >
                        All
                    </li>
                    {categories.map((category) => (
                        <li key={category} className="mt-2">
                            <div
                                className={`text-gray-600 cursor-pointer hover:text-indigo-500 break-words ${selectedCategory === category && selectedSubCategory === '' ? 'font-bold text-indigo-500' : ''
                                    }`}
                                onClick={() => {
                                    setSelectedCategory(category);
                                    setSelectedSubCategory('');
                                }}
                            >
                                {category}
                            </div>
                            {/* Subcategories */}
                            {selectedCategory === category && subcategories[category].length > 0 && (
                                <ul className="ml-4 mt-1">
                                    {subcategories[category].map((subcat) => (
                                        <li
                                            key={subcat}
                                            className={`text-gray-600 cursor-pointer hover:text-indigo-500 break-words ${selectedSubCategory === subcat ? 'font-bold text-indigo-500' : ''
                                                }`}
                                            onClick={() => {
                                                setSelectedCategory(category);
                                                setSelectedSubCategory(subcat);
                                            }}
                                        >
                                            {subcat}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default TemplateSidebar;
