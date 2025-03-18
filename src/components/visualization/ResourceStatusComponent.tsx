import React from 'react';

const ResourceStatusComponent = ({ status }: { status: string }) => {
    const getStatusLabel = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'running':
                return 'Active';
            case 'stopped':
                return 'Stopped';
            case 'unknown':
                return 'Unknown';
            default:
                return 'Unknown';
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'running':
                return 'bg-green-100 text-green-800';
            case 'stopped':
                return 'bg-red-100 text-red-800';
            case 'unknown':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(status)}`}>
                {getStatusLabel(status)}
            </span>
        </div>
    );
};

export default ResourceStatusComponent;