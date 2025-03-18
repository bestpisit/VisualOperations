import React from 'react'

interface LogType {
    message: string
    timestamp?: Date
}

interface LogSectionProps {
    title?: string
    logs: LogType[]
    dark?: boolean
}

const LogSection: React.FC<LogSectionProps> = ({ title, logs, dark = true }) => {
    const getLogsDuration = (logs: LogType[]) => {
        if (logs.length === 0) return '0s';

        const start = new Date(logs[0].timestamp || '').getTime();
        const end = new Date(logs[logs.length - 1].timestamp || '').getTime();
        const durationMs = Math.abs(end - start);

        if (durationMs < 1000) {
            return `${durationMs}ms`; // If duration is less than 1 second, show milliseconds
        }

        const seconds = Math.floor(durationMs / 1000);
        if (seconds < 60) {
            return `${seconds}s`; // If duration is less than 60 seconds, show seconds
        }

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes}m ${seconds % 60}s`; // If duration is less than 60 minutes, show minutes and seconds
        }

        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`; // Show hours, minutes, and seconds if duration is longer
    };

    if (dark) {
        return (
            <div className="relative bg-gray-900 overflow-auto">
                {title && <h2 className="sticky top-0 bg-gray-800 text-lg text-white font-bold px-4 py-2 border-y w-full flex justify-between items-center">{title}<span className='text-gray-300 text-sm'>{logs.filter(log => log.timestamp).length > 0 ? getLogsDuration(logs) : ''}</span></h2>}
                <div className="px-4 py-2 bg-gray-900 text-white">
                    {logs.map((log, index) => (
                        <div className='flex' key={index}>
                            {/* <span className="text-gray-500 mr-4">{log.timestamp}</span> */}
                            <span>{log.message}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-white overflow-auto">
            {title && <h2 className="sticky top-0 bg-white text-lg font-bold px-4 py-2 border-y w-full flex justify-between items-center">{title}<span className='text-gray-500 text-sm'>{logs.filter(log => log.timestamp).length > 0 ? getLogsDuration(logs) : ''}</span></h2>}
            <div className="px-4 py-2 bg-gray-100">
                {logs.map((log, index) => (
                    <div className='flex' key={index}>
                        {/* <span className="text-gray-500 mr-4">{log.timestamp}</span> */}
                        <span>{log.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default LogSection