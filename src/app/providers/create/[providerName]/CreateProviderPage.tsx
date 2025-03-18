'use client';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { ProviderTemplate } from '@/types/PlatformStructure';
import { useRouter } from 'next-nprogress-bar';

interface CreateProviderPageProps {
    provider: ProviderTemplate;
}

const CreateProviderPage: React.FC<CreateProviderPageProps> = ({ provider }) => {
    const [step, setStep] = useState(2);
    const [selectedProvider, setSelectedProvider] = useState<ProviderTemplate>(provider);
    const [providerName, setProviderName] = useState('');
    const [providerDescription, setProviderDescription] = useState('');
    const [inputConfig, setInputConfig] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(()=>{
        initializeInputConfigWithDefaults(provider);
    },[]);

    // Step 1: Choose Provider Template
    const handleProviderSelection = (provider: ProviderTemplate) => {
        setSelectedProvider(provider);
        initializeInputConfigWithDefaults(provider);
        setStep(2);
    };

    // Step 2: Set Name and Description
    const handleNameDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'providerName') setProviderName(value);
        if (name === 'providerDescription') setProviderDescription(value);
    };

    // Initialize input configuration with default values
    const initializeInputConfigWithDefaults = (provider: ProviderTemplate) => {
        const initialConfig: Record<string, any> = {};
        provider.inputs.forEach((input) => {
            if (input.default !== undefined) {
                initialConfig[input.name] = input.default;
            }
        });
        setInputConfig(initialConfig);
    };

    // Step 3: Set Input Configuration
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, input: any) => {
        const { type, name, checked, value } = e.target;
        const parsedValue = type === 'checkbox' ? checked : input.type === 'number' ? parseFloat(value) : value;

        // CIDR validation regex
        const cidrRegex = new RegExp(input.type === 'regex' ? input.validation?.regex : null);

        if (input.type === 'regex' && !cidrRegex?.test(parsedValue as string)) {
            setErrors((prevErrors) => ({
                ...prevErrors,
                [name]: input.validation?.error_message || 'The CIDR range must be a valid format (e.g., 192.168.0.0/24). Ensure IPs are valid and the prefix is between 0 and 32.',
            }));
        } else {
            setErrors((prevErrors) => ({
                ...prevErrors,
                [name]: '',
            }));
        }

        setInputConfig({
            ...inputConfig,
            [name]: parsedValue,
        });
    };

    // Validate inputs
    const validateInputs = () => {
        const newErrors: Record<string, string> = {};

        if (!selectedProvider) newErrors.selectedProvider = 'Please select a provider template';
        if (!providerName) newErrors.providerName = 'Provider name is required';
        if (!providerDescription) newErrors.providerDescription = 'Provider description is required';

        selectedProvider?.inputs.forEach((input) => {
            if (input.required && !inputConfig[input.name]) {
                newErrors[input.name] = `${input.name} is required`;
            }
            else if (input.type === 'regex') {
                const cidrRegex = new RegExp(input.type === 'regex' ? input.validation?.regex : null);
                if (!cidrRegex.test(inputConfig[input.name])) {
                    newErrors[input.name] = input.validation?.error_message || 'The CIDR range must be a valid format (e.g., 192.168.0.0/24). Ensure IPs are valid and the prefix is between 0 and 32.';
                }
            }
        });

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const router = useRouter();

    // Step 4: Review and Create Provider (using Axios for POST)
    const handleReviewAndCreate = async () => {
        if (validateInputs()) {
            try {
                const response = await axios.post('/api/providers', {
                    terraformProviderId: selectedProvider?.id,
                    name: providerName,
                    description: providerDescription,
                    config: inputConfig,
                });

                if (response.status === 201) {
                    toast.success('Provider Created Successfully');
                    router.push(`/providers/${response.data.name}`);
                } else {
                    toast.error('Failed to create provider.');
                }
            } catch (error) {
                toast.error('An error occurred while creating the provider.');
                console.error('Error creating provider:', error);
            }
        } else {
            toast.error('Please fill in all required fields before creating the provider.');
        }
    };

    const handleNextStep = () => {
        if (step === 3 && validateInputs()) {
            setStep(4);
        } else if (step === 2 && providerName && providerDescription) {
            setStep(3);
        }
    };

    const handlePreviousStep = () => {
        if (step === 2) router.push('/providers/create');
        else if (step > 2) setStep(step - 1);
    };
    const handleListInputChange = (inputName: string, value: string) => {
        setInputConfig((prevConfig) => {
            const currentList = prevConfig[inputName] || [];
            if (!currentList.includes(value)) {
                return {
                    ...prevConfig,
                    [inputName]: [...currentList, value],
                };
            }
            return prevConfig;
        });
    };

    const handleListItemRemove = (inputName: string, value: string) => {
        setInputConfig((prevConfig) => ({
            ...prevConfig,
            [inputName]: prevConfig[inputName]?.filter((item: string) => item !== value),
        }));
    };


    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Create {selectedProvider?.name} Provider</h1>

            {step === 1 && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Step 1: Choose a Provider Template</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div
                            className="border p-4 rounded shadow cursor-pointer hover:bg-gray-100"
                            onClick={() => handleProviderSelection(provider)}
                        >
                            <h3 className="text-lg font-semibold">{provider.name}</h3>
                            <p>{provider.description}</p>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Step 2: Set Provider Name and Description</h2>
                    <div className="mb-4">
                        <label className="block text-gray-700">Provider Name</label>
                        <input
                            type="text"
                            name="providerName"
                            className={`border px-4 py-2 rounded w-full ${errors.providerName ? 'border-red-500' : ''}`}
                            value={providerName}
                            onChange={handleNameDescriptionChange}
                        />
                        {errors.providerName && <p className="text-red-500 text-sm">{errors.providerName}</p>}
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700">Provider Description</label>
                        <input
                            type="text"
                            name="providerDescription"
                            className={`border px-4 py-2 rounded w-full ${errors.providerDescription ? 'border-red-500' : ''}`}
                            value={providerDescription}
                            onChange={handleNameDescriptionChange}
                        />
                        {errors.providerDescription && <p className="text-red-500 text-sm">{errors.providerDescription}</p>}
                    </div>
                </div>
            )}

            {step === 3 && selectedProvider && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Step 3: Set Input Configuration for {selectedProvider.name}</h2>
                    <form>
                        {selectedProvider.inputs.map((input, index) => (
                            <div key={index} className="mb-4">
                                <label className="block text-gray-700">
                                    {input.title || input.name} <span className="text-red-600">{input.required ? '*' : ''}</span>
                                </label>
                                {input.type === 'boolean' && (
                                    <input
                                        type="checkbox"
                                        className="mr-2 leading-tight"
                                        name={input.name}
                                        onChange={(e) => handleInputChange(e, input)}
                                        checked={inputConfig[input.name] || false}
                                    />
                                )}

                                {input.type === 'number' && (
                                    <input
                                        type="number"
                                        className={`border px-4 py-2 rounded w-full ${errors[input.name] ? 'border-red-500' : ''}`}
                                        placeholder={input.description}
                                        name={input.name}
                                        onChange={(e) => handleInputChange(e, input)}
                                        value={inputConfig[input.name] || ''}
                                        required={input.required}
                                    />
                                )}

                                {input.type !== 'boolean' && input.type !== 'number' && input.type !== 'list' && (
                                    <input
                                        type={input.secret ? 'password' : 'text'} // Mask the input if `input.secret` is true
                                        className={`border px-4 py-2 rounded w-full ${errors[input.name] ? 'border-red-500' : ''}`}
                                        placeholder={input.description}
                                        name={input.name}
                                        onChange={(e) => handleInputChange(e, input)}
                                        value={inputConfig[input.name] || ''}
                                        required={input.required}
                                    />
                                )}

                                {input.type === 'list' && (
                                    <div>
                                        <input
                                            type="text"
                                            className="border px-4 py-2 rounded w-full"
                                            placeholder={`Add value to ${input.name}`}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                                                    e.preventDefault();
                                                    handleListInputChange(input.name, e.currentTarget.value.trim());
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                        <ul className="mt-2">
                                            {(inputConfig[input.name] || []).map((item: string, idx: number) => (
                                                <li key={idx} className="flex items-center gap-2">
                                                    <span>{item}</span>
                                                    <button
                                                        className="text-red-500 hover:underline"
                                                        onClick={() => handleListItemRemove(input.name, item)}
                                                    >
                                                        Remove
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {errors[input.name] && <p className="text-red-500 text-sm">{errors[input.name]}</p>}
                            </div>
                        ))}
                    </form>
                </div>
            )}

            {step === 4 && selectedProvider && (
                <div>
                    <h2 className="text-xl font-semibold mb-4">Step 4: Review and Create Provider</h2>
                    <div className="border p-4 rounded bg-gray-50">
                        <h3 className="text-lg font-bold">{selectedProvider.name}</h3>
                        <p>{selectedProvider.description}</p>
                        <h4 className="text-lg font-semibold mt-4">Inputs</h4>
                        <ul>
                            {selectedProvider.inputs.map((input, index) => (
                                <li key={index}>
                                    <strong>{input.name}:</strong> {input.secret ? '******' : inputConfig[input.name] || 'Not Set'}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded mt-4 hover:bg-blue-700"
                        onClick={handleReviewAndCreate}
                    >
                        Create Provider
                    </button>
                </div>
            )}

            <div className="flex justify-between mt-6">
                {step > 1 && (
                    <button className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700" onClick={handlePreviousStep}>
                        Previous
                    </button>
                )}
                {step < 4 && selectedProvider && (
                    <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={handleNextStep}>
                        Next
                    </button>
                )}
            </div>
        </div>
    );
};

export default CreateProviderPage;