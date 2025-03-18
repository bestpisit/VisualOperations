'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud } from 'lucide-react';

interface UploadFileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFileUpload: (file: File) => void;
}

const UploadFileModal: React.FC<UploadFileModalProps> = ({ isOpen, onClose, onFileUpload }) => {
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleDragEnter = () => setDragging(true);
    const handleDragLeave = () => setDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };

    const handleFile = (file: File) => {
        if (!file.name.endsWith('.png')) {
            setError('Only ZIP files are allowed');
            return;
        }
        setError('');
        onFileUpload(file);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg w-96 p-6 shadow-lg relative">
                <button
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                >
                    <X className="w-6 h-6" />
                </button>
                <h2 className="text-xl text-center font-semibold text-gray-800 mb-4">Upload Template ZIP File</h2>
                <div
                    className={`border-2 border-dashed p-6 text-center rounded-lg transition-colors ${dragging ? 'border-indigo-500' : 'border-gray-300'
                        }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Drag and drop your ZIP file here, or</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".zip"
                        onChange={handleFileInputChange}
                    />
                    <button
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Select File
                    </button>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default UploadFileModal;