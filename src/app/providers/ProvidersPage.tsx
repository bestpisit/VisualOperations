'use client';
import { toast } from "react-toastify";
import { useCallback, useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import { Provider } from "@prisma/client";
import axios from "axios";
import { useRouter } from "next-nprogress-bar";
import ProviderCard from "./ProviderCard";

const ProvidersPage = () => {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                setIsLoading(true);
                const { data } = await axios.get(`/api/providers`); // Adjust the API endpoint as needed
                setProviders(data);
                setFilteredProviders(data);
                setIsLoading(false);
            } catch {
                toast.error('Error fetching providers. Please try again.');
                setIsLoading(false);
            }
        };
        fetchProviders();
    }, []);

    const debounce = (func: (...args: any) => void, delay: number) => {
        let timeoutId: ReturnType<typeof setTimeout>;
        return (...args: any) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };    

    const debouncedSearch = useCallback(
        debounce((query: string) => {
            if (query.trim()) {
                const filtered = providers.filter((provider) =>
                    provider.name.toLowerCase().includes(query.toLowerCase())
                );
                setFilteredProviders(filtered);
            } else {
                setFilteredProviders(providers);
            }
        }, 300),
        [providers]
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        debouncedSearch(value);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setFilteredProviders(providers);
    };

    return (
        <div className={`flex-grow w-full h-full bg-secondary-100 flex flex-col overflow-auto`}>
            <div className="flex justify-between items-center p-4 py-0 bg-white rounded-lg h-[80px] min-h-[80px] max-h-[80px]">
                <h1 className="font-bold text-2xl text-slate-800 text-center my-auto">Providers</h1>
                <div className="w-[400px] mx-auto">
                    <SearchBar
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e)}
                        onClear={handleClearSearch}
                        placeholder="Search providers..."
                    />
                </div>
            </div>

            <div className="flex-grow w-full h-full flex-col flex overflow-auto shadow-inner bg-gradient-to-b from-indigo-100 to-white pt-4">
                {isLoading ? (
                    <div className="flex justify-center items-center">
                        <div className="loader" />
                    </div>
                ) :
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                        <div className='flex w-full h-full justify-center'>
                            <div
                                onClick={() => router.push('/providers/create')}
                                className="w-64 h-64 bg-secondary-100 shadow-lg rounded-lg p-4 flex flex-col justify-center items-center hover:bg-slate-100 cursor-pointer transition duration-300 ease-in-out"
                            >
                                <h2 className="text-xl font-bold text-gray-700">Create Providers</h2>
                                <div className="text-6xl text-gray-500 mt-4">+</div>
                            </div>
                        </div>
                        {filteredProviders.map((provider) => (
                            <div className="flex w-full h-full justify-center" key={provider.name}>
                                <ProviderCard id={provider.id} name={provider.name} description={provider.description || ""} />
                            </div>
                        ))}
                    </div>
                }
            </div>
        </div>
    );
};

export default ProvidersPage;