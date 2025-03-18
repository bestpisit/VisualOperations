'use client';
import TemplateCard from "@/components/templates/TemplateCard";
import TemplateSidebar from "@/components/templates/TemplateSidebar";
import { toast } from "react-toastify";
import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import UploadFileModal from "@/components/templates/UploadFileModal";
import { DeploymentTemplate } from "@/types/PlatformStructure";

interface TemplatesPageProps {
    templates: DeploymentTemplate[];
    categories: string[];
    subcategories: Record<string, string[]>;
}

const TemplatesPage: React.FC<TemplatesPageProps> = ({ templates, categories, subcategories }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSubCategory, setSelectedSubCategory] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleFileUpload = () => {
        toast.success('Template uploaded successfully!');
        setIsModalOpen(false);
        // try {
        //     // Allowed image types
        //     const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];

        //     // Validate file type
        //     if (!allowedTypes.includes(file.type)) {
        //         toast.error("Invalid file type. Only PNG, JPG, and GIF are allowed.");
        //         return;
        //     }

        //     const formData = new FormData();
        //     formData.append("file", file);

        //     setUploading(true); // Indicate that upload is in progress

        //     // Using toast.promise for feedback
        //     await toast.promise(
        //         axios.post("/api/images", formData, {
        //             headers: {
        //                 "Content-Type": "multipart/form-data",
        //             },
        //         }),
        //         {
        //             pending: "Uploading image...",
        //             success: "Image uploaded successfully!",
        //             error: "Failed to upload image",
        //         }
        //     );

        //     setIsModalOpen(false); // Close modal after upload success
        // } catch (error) {
        //     console.error("Upload error:", error);
        //     toast.error("Unexpected error occurred. Check console for details.");
        // } finally {
        //     setUploading(false);
        // }
    };

    // Filter templates by search term, main category, and subcategory
    const filteredTemplates = templates.filter(template => {
        const matchesSearchTerm = template.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
        const matchesSubCategory = selectedSubCategory === '' || template.subcategory === selectedSubCategory;
        return matchesSearchTerm && matchesCategory && matchesSubCategory;
    });

    return (
        <div className={`flex-grow w-full h-full bg-secondary-100 flex flex-col overflow-auto`}>
            <div className="flex justify-items-start p-4 py-0 bg-white rounded-lg h-[80px] min-h-[80px] max-h-[80px]">
                <h1 className="font-bold text-2xl text-slate-800 text-center my-auto ml-3">Templates</h1>
                <div className='mx-auto flex w-[400px]'>
                    <SearchBar
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search templates..."
                    />
                </div>
                {/* <button onClick={()=>setIsModalOpen(true)} className='flex gap-2 my-auto hover:text-indigo-700'><Import/><p className='hidden sm:hidden md:block ld:block'>Import Template</p></button> */}
                <div>
                    <UploadFileModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        onFileUpload={handleFileUpload}
                    />
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-grow w-full h-full flex overflow-auto shadow-inner bg-gradient-to-b from-indigo-100 to-white">
                {/* Sidebar Section */}
                <div className="w-64 max-w-64 h-full overflow-auto">
                    <TemplateSidebar
                        categories={categories}
                        subcategories={subcategories}
                        selectedCategory={selectedCategory}
                        selectedSubCategory={selectedSubCategory}
                        setSelectedCategory={setSelectedCategory}
                        setSelectedSubCategory={setSelectedSubCategory}
                    />
                </div>

                {/* Main Content Section */}
                <div className="w-full h-full flex-grow overflow-auto bg-gradient-to-br from-white to-indigo-100 shadow-inner p-8">
                    <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredTemplates.length > 0 ? (
                            filteredTemplates.map((template, index) => (
                                <TemplateCard
                                    key={index}
                                    title={template.name}
                                    provider={template.category}
                                    type={template.subcategory}
                                    description={template.description}
                                    imageKey={template.imageKey}
                                    templateName={template.name}
                                    category={template.category}
                                    subcategory={template.subcategory}
                                    templateId={template.id}
                                />
                            ))
                        ) : (
                            <p>No templates found.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TemplatesPage;