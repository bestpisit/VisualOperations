'use client';
import { useCallback, useEffect, useState } from "react";
import Image from 'next/image';
import { toast } from "react-toastify";
import { ImageInventory } from "@/images/ImageInventory";
import axios from "axios";
import { handleApiError } from "@/types/api/apiError";
import { Deployment, Project, Provider, Resource } from "@prisma/client";
import { useRouter } from "next-nprogress-bar";
import { ROUTES } from "@/lib/route";
import { DeploymentTemplate, InputTypes } from "@/types/PlatformStructure";
import { debounce } from 'lodash';
import { Ban, CircleCheck, Eye, EyeOff, LoaderCircle } from "lucide-react";
import EnvVariablesInput from "./EnvVariablesInput";
import { Progress } from "@/components/ui/progress";
import ValidateDeployment from "./ValidateDeployment";

interface TemplatePageProps {
    templateData: DeploymentTemplate;
    projects: Project[];
    providerss?: Provider[];
    projectId?: string;
    providerId?: string;
}

const TemplatePage: React.FC<TemplatePageProps> = ({ templateData, projects, projectId, providerId, providerss }) => {
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            // Modern browsers ignore event.returnValue but setting it ensures compatibility
            event.preventDefault();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);
    const [formData, setFormData] = useState<Record<string, any>>(() => {
        const initialData: Record<string, any> = {};
        templateData.inputs.forEach((input) => {
            if (input.type === InputTypes.Boolean) {
                initialData[input.name] = input.default || false;
            }
            else {
                initialData[input.name] = input.default || '';
            }
        });
        initialData['project'] = projectId;
        if (templateData.inputs.find(input => input.type === 'providers')?.name) {
            initialData[templateData.inputs.find(input => input.type === 'providers')?.name as string] = providerId;
        }
        return initialData;
    });

    const allProviderIsInputted = () => {
        const allProvidersInput = templateData.inputs.filter(input => input.type === 'providers');
        return allProvidersInput.every(input => !!formData[input.name]);
    }

    const router = useRouter();

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [constraintPass, setConstraintPass] = useState<Record<string, boolean | null | undefined>>({});

    const checkforUniqueConstraint = async (key: string, value: string) => {
        try {
            const response = await axios.post(`/api/projects/${projectId}/unique-constraint`, {
                key,
                value,
                templateId: templateData.id
            });
            if (response.status === 200) {
                setConstraintPass({
                    ...constraintPass,
                    [key]: true
                });
                return true;
            }
            setConstraintPass({
                ...constraintPass,
                [key]: false
            });
            return false;
        }
        catch {
            setConstraintPass({
                ...constraintPass,
                [key]: false
            });
            return false;
        }
    }

    const debouncedCheck = useCallback(
        debounce((constraint: string, value: string) => {
            checkforUniqueConstraint(constraint, value);
        }, 500),
        []
    );

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        if (templateData.inputs.find(input => input.name === name)?.type === InputTypes.Providers) {
            return router.push(`${ROUTES.TEMPLATE(templateData.id)}/${formData['project']}/${value}`);
        }
        if (name === 'project') {
            return router.push(`${ROUTES.TEMPLATE(templateData.id)}/${value}`);
        }
        if (type === InputTypes.Regex) {

        }
        const constraint = templateData.inputs.find(input => input.name === name)?.constraint;
        if (constraint && value !== '') {
            setConstraintPass({
                ...constraintPass,
                [constraint]: null
            });
            debouncedCheck(constraint, value);
        }
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const validateInputs = () => {
        const newErrors: Record<string, string> = {};

        templateData.inputs.forEach((input) => {
            if (input.type === InputTypes.Regex) {
                const cidrRegex = new RegExp(input.validation?.regex);
                if (!cidrRegex?.test(formData[input.name] as string)) {
                    newErrors[input.name] = input.validation?.error_message;
                }
            }
            else if (input.type === InputTypes.Map) {
                if (input.required && !formData[input.name]) {
                    newErrors[input.name] = `${input.name} is required`;
                }
                else if (formData[input.name] && Object.entries(formData[input.name]).length > 0) {
                    Object.entries(formData[input.name]).forEach(([key, value]) => {
                        if (!value || key === '') {
                            newErrors[input.name] = `Please fill out all fields`;
                        }
                    });
                }
            }
            else if (input.type === InputTypes.Boolean) {
                if (input.required && formData[input.name] !== false && formData[input.name] !== true) {
                    newErrors[input.name] = `${input.name} is required`;
                }
            }
            else if (input.required && !formData[input.name]) {
                newErrors[input.name] = `${input.name} is required`;
            }
            if (input.constraint) {
                if (constraintPass[input.constraint] === false) {
                    newErrors[input.name] = 'Unique constraint failed';
                }
            }
        });

        if (!formData['project']) {
            newErrors['project'] = 'Project is required';
        }

        if (Object.entries(newErrors).length === 0) {
            setIsValidatePass(true);
        }
        else {
            setIsValidatePass(false);
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (validateInputs()) {
            const selectedProject = projects?.find((project) => project.uuid === formData['project']);
            if (!selectedProject) {
                toast.error('Invalid project selected.');
                return;
            }
            try {
                const response = await axios.post(`/api/projects/${selectedProject.uuid}/deployments`,
                    {
                        templateId: templateData.id,
                        config: Object.entries(formData).reduce((acc, [key, value]) => {
                            if (key !== 'project') {
                                acc[key] = value;
                            }
                            return acc;
                        }, {} as Record<string, any>)
                    }
                )
                // toast.success(response.data.message);
                // router.push(ROUTES.PROJECT_DEPLOYMENTS(selectedProject.uuid));
                setDeploymentId(response.data.deploymentId);
                setIsValidating(true);
            }
            catch (e) {
                console.error(e);
                toast.error(handleApiError(e));
            }
        } else {
            toast.error('Please fill out the form.');
        }
    };

    const [providers,] = useState<Provider[]>(providerss || []);
    const [resources, setResources] = useState<Resource[]>([]);

    const fetchProjectResources = async () => {
        try {
            const response = await axios.get(`/api/projects/${projectId}/resources?templateId=true`);
            if (response.status !== 200) {
                toast.error('Failed to fetch resources');
            }
            setResources(response.data);
        }
        catch (e) {
            console.error(e);
            toast.error(handleApiError(e));
        }
    }

    useEffect(() => {
        if (projectId && !!templateData.inputs.find(input => input.type === InputTypes.Resource)) {
            fetchProjectResources();
        }
    }, [templateData]);

    const [isProvidersLoading,] = useState(false);

    const [isValidatePass, setIsValidatePass] = useState(false);

    useEffect(() => {
        validateInputs();
    }, [formData, constraintPass]);

    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

    const toggleShowPassword = (inputName: string) => {
        setShowPassword((prev: Record<string, boolean>) => ({
            ...prev,
            [inputName]: !prev[inputName],
        }));
    };

    function getProgressValues(input: any, currentX: any) {
        const max = input?.validation?.max ?? 0;
        const current = parseInt(currentX) || 0; // Ensure current is a valid number

        if (max === 0) {
            return { value: 100, max: 100, indicatorColor: "bg-red-500" }; // If max is 0, set to full progress
        }

        const percentage = Math.min((current / max) * 100, 100); // Calculate percentage, ensuring max 100%

        // Determine color based on percentage
        let indicatorColor = "bg-green-500"; // Default green
        if (percentage > 50 && percentage <= 80) {
            indicatorColor = "bg-yellow-500"; // Transition to yellow
        } else if (percentage > 80 && current <= max) {
            indicatorColor = "bg-orange-500"; // Transition to red
        }
        else if (percentage >= 100) {
            indicatorColor = "bg-red-500";
        }

        return { value: percentage, max: 100, indicatorColor };
    }

    const [isValidating, setIsValidating] = useState(false);
    const [deploymentId, setDeploymentId] = useState<Deployment['id'] | null>('cm7zx1rzs0010vvr8sp9jt5rv');

    return (
        <div className="flex container flex-grow flex-col h-full mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">{templateData.name}
                <span className="ml-2 text-base text-gray-700">
                    {'#' + templateData.id}
                </span>
            </h1>
            <p className="mb-6">{templateData.description}</p>

            {
                !isValidating && (

                    <form onSubmit={handleSubmit} className="relative pb-10">
                        <div className="mb-4">
                            <label className="block text-gray-700 font-semibold mb-2">
                                Projects <span className="text-red-500">*</span>
                            </label>
                            <div className='flex gap-2 flex-col'>
                                <select
                                    name="project"
                                    value={formData['project'] || ''} // Use empty string if value is null/undefined
                                    required
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-md ${errors['project'] ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                >
                                    <option value="" disabled hidden>
                                        Select a project
                                    </option>
                                    {projects &&
                                        projects.map((project) => (
                                            <option key={project.uuid} value={project.uuid}>
                                                {project.name}
                                            </option>
                                        ))}
                                </select>
                                {errors['project'] && (
                                    <p className="text-red-500 text-sm">{errors['project']}</p>
                                )}
                            </div>
                        </div>

                        {formData['project'] && templateData.inputs.map((input, index) => (
                            <div key={index} className="mb-4 relative">
                                {
                                    (formData['project'] && allProviderIsInputted() || input.type === 'providers') &&
                                    <label className="text-gray-700 font-semibold mb-2 flex gap-2 items-center">
                                        {input.title} {input.required && <span className="text-red-500">*</span>}
                                        {
                                            input.constraint && constraintPass[input.constraint] === null &&
                                            (
                                                <LoaderCircle className="w-5 h-5 text-indigo-500 animate-spin" />
                                            )
                                        }
                                        {
                                            input.constraint && constraintPass[input.constraint] === true && formData[input.name] !== '' &&
                                            (
                                                <>
                                                    <CircleCheck className="w-5 h-5 text-green-500" />
                                                    <label className="text-green-500 text-sm font-normal">This {input.title} is available</label>
                                                </>
                                            )
                                        }
                                        {
                                            input.constraint && constraintPass[input.constraint] === false && formData[input.name] !== '' &&
                                            (
                                                <>
                                                    <Ban className="w-5 h-5 text-red-500" />
                                                    <label className="text-red-500 text-sm font-normal">This {input.title} is not available</label>
                                                </>
                                            )
                                        }
                                        {
                                            input.quota && (
                                                <div className="w-[300px] flex gap-2 justify-center items-center">
                                                    <Progress className="border" {...getProgressValues(input, formData[input.name])} />
                                                    <div className="font-normal text-sm text-gray-500 whitespace-nowrap">{formData[input.name]}/{input.validation.max} remain</div>
                                                </div>
                                            )
                                        }
                                    </label>
                                }
                                {input.type === 'boolean' && formData['project'] && allProviderIsInputted() ? (
                                    // Checkbox input for boolean type
                                    <input
                                        type="checkbox"
                                        name={input.name}
                                        checked={formData[input.name]}
                                        onChange={handleChange}
                                        className="mr-2 leading-tight"
                                    />
                                ) : input.type === 'providers' ? (
                                    // Dropdown input for providers type, no condition
                                    <div className="flex flex-col gap-2">
                                        <div className="flex w-full">
                                            <Image
                                                src={ImageInventory.Icon.Proxmox}
                                                alt="Providers"
                                                className="w-[40px] h-[40px]"
                                            />
                                            <select
                                                disabled={isProvidersLoading || !formData['project']}
                                                name={input.name}
                                                value={formData[input.name] || ''} // Use empty string if value is null/undefined
                                                onChange={handleChange}
                                                className={`w-full px-4 py-2 border rounded-md ${errors[input.name] ? 'border-red-500' : 'border-gray-300'
                                                    } ${isProvidersLoading || !formData['project']
                                                        ? 'cursor-not-allowed'
                                                        : 'cursor-pointer'
                                                    }`}
                                            >
                                                <option value="" disabled>
                                                    Select a provider
                                                </option>
                                                {providers?.map((provider) => (
                                                    <option key={provider.id} value={provider.uuid}>
                                                        {provider.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {errors[input.name] && (
                                            <p className="text-red-500 text-sm">{errors[input.name]}</p>
                                        )}
                                    </div>
                                ) : input.type === InputTypes.Resource && input.resourceTypes ? (
                                    // Dropdown input for providers type, no condition
                                    <div className="flex flex-col gap-2">
                                        <div className="flex w-full">
                                            <Image
                                                src={ImageInventory.Icon.Terraform}
                                                alt="Providers"
                                                className="w-[40px] h-[40px]"
                                            />
                                            <select
                                                disabled={isProvidersLoading || !formData['project']}
                                                name={input.name}
                                                value={formData[input.name] || ''} // Use empty string if value is null/undefined
                                                onChange={handleChange}
                                                className={`w-full px-4 py-2 border rounded-md ${errors[input.name] ? 'border-red-500' : 'border-gray-300'
                                                    } ${isProvidersLoading || !formData['project']
                                                        ? 'cursor-not-allowed'
                                                        : 'cursor-pointer'
                                                    }`}
                                            >
                                                <option value="" disabled>
                                                    Select a resource
                                                </option>
                                                {resources?.filter((resource: any) => input?.resourceTypes?.includes(resource?.deployment?.templateId))?.map((resource) => (
                                                    <option key={resource.uuid} value={resource.uuid}>
                                                        {resource.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {errors[input.name] && (
                                            <p className="text-red-500 text-sm">{errors[input.name]}</p>
                                        )}
                                    </div>
                                ) : input.type === 'list' && allProviderIsInputted() ? (
                                    // Dynamic list input using predefined options
                                    <div className="flex flex-col gap-2">
                                        <select
                                            value={formData[input.name]}
                                            onChange={(e) => {
                                                setFormData({ ...formData, [input.name]: e.target.value });
                                            }}
                                            className="flex-1 px-4 py-2 border rounded-md"
                                        >
                                            <option value="" disabled>
                                                Select an option
                                            </option>
                                            {input.validation?.list?.map((option: string) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                        {errors[input.name] && (
                                            <p className="text-red-500 text-sm">{errors[input.name]}</p>
                                        )}
                                    </div>
                                ) : input.type === InputTypes.Map && allProviderIsInputted() ? (
                                    <EnvVariablesInput formData={formData} setFormData={setFormData} errors={errors} mainKey={input.name} />
                                ) : formData['project'] && allProviderIsInputted() ? (
                                    // Text, number, or password input for other types with condition
                                    <>
                                        <div className="relative">
                                            <input
                                                type={
                                                    input.secret
                                                        ? showPassword[input.name] ? 'text' : 'password' // Toggle visibility
                                                        : input.type === 'number'
                                                            ? 'number'
                                                            : 'text'
                                                }
                                                name={input.name}
                                                value={formData[input.name]}
                                                onChange={handleChange}
                                                className={`w-full px-4 py-2 border rounded-md ${errors[input.name] ? 'border-red-500' : 'border-gray-300'}`}
                                                placeholder={input.description}
                                            />
                                            {input.secret && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleShowPassword(input.name)}
                                                    className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                                                >
                                                    {showPassword[input.name] ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            )}
                                        </div>
                                        {errors[input.name] && (
                                            <p className="text-red-500 text-sm">{errors[input.name]}</p>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        ))}


                        {isValidatePass && <button
                            type="submit"
                            className="px-6 py-2 bg-indigo-600 text-white rounded-md shadow-md hover:bg-indigo-700 mb-4 absolute mt-2 right-0"
                        >
                            Submit
                        </button>}
                    </form>
                )
            }
            {
                isValidating && deploymentId && projectId && (
                    <ValidateDeployment deploymentId={deploymentId} projectUUID={projectId} setValidated={setIsValidating} setDeploymentId={setDeploymentId}/>
                )
            }
        </div>
    );
};

export default TemplatePage;