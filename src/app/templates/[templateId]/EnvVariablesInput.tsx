import { useState, useCallback, useRef } from "react";
import { Eye, EyeOff, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const EnvVariablesInput = ({
    formData,
    setFormData,
    errors,
    mainKey
}: {
    formData: Record<string, any>,
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    errors: Record<string, any>,
    mainKey: string
}) => {
    const [envVars, setEnvVars] = useState<Record<string, string>>(formData[mainKey] || {});
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const handleChange = useCallback((key: string, value: string) => {
        setEnvVars((prev) => ({
            ...prev,
            [key]: value,
        }));

        setFormData((prev) => ({
            ...prev,
            [mainKey]: {
                ...prev[mainKey],
                [key]: value,
            },
        }));
    }, [setFormData, mainKey]);

    /**
     * ADD a new environment variable with a guaranteed unique key
     */
    const addEnvVar = () => {
        const baseKey = "VARIABLE";
        let counter = 0;
        let newKey = `${baseKey}_${counter}`;

        // If 'newKey' already exists, keep incrementing
        while (envVars[newKey] !== undefined) {
            counter++;
            newKey = `${baseKey}_${counter}`;
        }

        setEnvVars((prev) => ({
            ...prev,
            [newKey]: "",
        }));

        setFormData((prev) => ({
            ...prev,
            [mainKey]: {
                ...prev[mainKey],
                [newKey]: "",
            },
        }));

        // Focus the new input on next render
        setTimeout(() => {
            inputRefs.current[newKey]?.focus();
        }, 0);
    };

    /**
     * REMOVE an environment variable
     */
    const removeEnvVar = (key: string) => {
        setEnvVars((prev) => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });

        setFormData((prev) => {
            const updated = { ...prev[mainKey] };
            delete updated[key];
            return {
                ...prev,
                [mainKey]: updated,
            };
        });
    };

    /**
     * TOGGLE password visibility (mask/unmask)
     */
    const toggleShowPassword = (inputName: string) => {
        setShowPassword((prev) => ({
            ...prev,
            [inputName]: !prev[inputName],
        }));
    };

    const [errorEnvVar, setErrorEnvVar] = useState("");
    const [showErrorEnvVar, setShowErrorEnvVar] = useState(false);

    /**
     * HANDLE renaming the 'key' part of the environment variable
     * onBlur, ensuring no duplicates and no empty keys
     */
    const handleKeyBlur = useCallback((oldKey: string, e: React.FocusEvent<HTMLInputElement>) => {
        const newKey = e.target.value.trim();

        // If user cleared the input or typed the same key, revert
        if (!newKey || newKey === oldKey) {
            e.target.value = oldKey;
            return;
        }

        // If the new key already exists, revert and optionally alert
        if (newKey in envVars) {
            e.target.value = oldKey;
            setErrorEnvVar(`Key "${newKey}" already exists.`);
            setShowErrorEnvVar(true);
            return;
        }

        // Otherwise, rename the key in both states
        const oldValue = envVars[oldKey];

        // Update local state
        setEnvVars((prev) => {
            const updated = { ...prev };
            delete updated[oldKey];
            updated[newKey] = oldValue;
            return updated;
        });

        // Update parent form data
        setFormData((prev) => {
            const main = { ...prev[mainKey] };
            delete main[oldKey];
            main[newKey] = oldValue;
            return { ...prev, [mainKey]: main };
        });
    }, [envVars, mainKey, setEnvVars, setFormData]);

    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <Button
                    type="button"
                    onClick={addEnvVar}
                    className="w-auto gap-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-500"
                >
                    <PlusCircle size={20} /> Add Environment Variable
                </Button>
            </div>

            {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex gap-2 items-center">
                    <div className="relative flex flex-grow gap-2">
                        {/* KEY input */}
                        <input
                            ref={(el) => {
                                inputRefs.current[key] = el;
                            }}
                            type="text"
                            defaultValue={key}
                            onBlur={(e) => handleKeyBlur(key, e)}
                            placeholder="Key"
                            className="flex-1 px-4 py-2 border rounded-md"
                        />

                        {/* VALUE input */}
                        <input
                            type={showPassword[key] ? "text" : "password"}
                            value={value}
                            onChange={(e) => handleChange(key, e.target.value)}
                            placeholder="Value"
                            className="flex-1 px-4 py-2 border rounded-md"
                        />

                        {/* Toggle password visibility */}
                        <button
                            type="button"
                            onClick={() => toggleShowPassword(key)}
                            className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                        >
                            {showPassword[key] ? <Eye size={20} /> : <EyeOff size={20} />}
                        </button>
                    </div>

                    {/* REMOVE variable */}
                    <button
                        type="button"
                        onClick={() => removeEnvVar(key)}
                        className="text-red-500"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            ))}

            {errors[mainKey] && (
                <p className="text-red-500 text-sm">{errors[mainKey]}</p>
            )}

            <Dialog open={showErrorEnvVar} onOpenChange={() => setShowErrorEnvVar(false)}>
                <DialogContent>
                    <p className="text-red-500">{errorEnvVar}</p>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EnvVariablesInput;