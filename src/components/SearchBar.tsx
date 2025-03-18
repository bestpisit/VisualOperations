import { Search, X } from "lucide-react";

interface SearchBarProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    onClear?: () => void; // Optional clear function
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder = 'Search...', onClear }) => {
    return (
        <div className="relative w-full mx-auto my-auto">
            <input
                type="text"
                className="w-full py-2 pl-10 pr-10 bg-gray-100 text-gray-800 rounded-lg shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />

            {/* Search Icon */}
            <Search className="absolute top-2 left-2 text-gray-400" />

            {/* Clear/Close Icon (optional) */}
            {value && onClear && (
                <X
                    onClick={onClear}
                    className="absolute top-2 right-2 text-gray-400 cursor-pointer"
                />
            )}
        </div>
    );
};

export default SearchBar;