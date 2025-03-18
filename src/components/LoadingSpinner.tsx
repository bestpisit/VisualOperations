const LoadingSpinner: React.FC<{ size?: string; className?: string }> = ({ size = "h-5 w-5", className = "" }) => {
    return (
        <div
            className={`animate-spin rounded-full border-2 border-t-transparent border-gray-500 ${size} ${className}`}
            role="status"
        ></div>
    );
};

export default LoadingSpinner;