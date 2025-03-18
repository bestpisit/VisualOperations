'use client';

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/route";
import { DeploymentStatus } from "@/types/PlatformStructure";
import { Deployment, Project } from "@prisma/client";
import axios from "axios";
import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { useRouter } from "next-nprogress-bar";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

const ValidateDeployment = ({ deploymentId, projectUUID, setValidated, setDeploymentId }: { deploymentId: Deployment['id'], projectUUID: Project['uuid'], setValidated: Dispatch<SetStateAction<boolean>>, setDeploymentId: Dispatch<SetStateAction<string | null>> }) => {
    const [fail, setFail] = useState<boolean>(false);
    const router = useRouter();
    const [complete, setComplete] = useState<boolean>(false);
    const fetchDeploymentStatus = async () => {
        try {
            const res = await axios.get(`/api/projects/${projectUUID}/deployments/${deploymentId}`);
            switch (res.data.status) {
                case DeploymentStatus.Waiting:
                    setTimeout(fetchDeploymentStatus, 1200);
                    break;
                case DeploymentStatus.Planning:
                    setTimeout(fetchDeploymentStatus, 1200);
                    break;
                case DeploymentStatus.Failed:
                    setFail(true);
                    break;
                default:
                    setComplete(true);
                    break;
            }
        }
        catch {
            setFail(true);
        }
    }
    useEffect(() => {
        fetchDeploymentStatus();
    }, []);
    return (
        <div className="flex flex-col h-full justify-center items-center">
            {!(complete || fail) &&
                <>
                    <LoaderCircle className="w-20 h-20 text-indigo-500 animate-spin" />
                    <div className="text-lg font-semibold mt-4 select-none">
                        Validating Deployment
                    </div>
                </>
            }
            {
                complete && (
                    <>
                        <CircleCheck className="w-20 h-20 text-green-500" />
                        <div className="text-lg font-semibold mt-4 select-none text-green-500">
                            Deployment Validated
                        </div>
                        <Button
                            type="button"
                            onClick={() => router.push(ROUTES.PROJECT_DEPLOYMENT(projectUUID, deploymentId))}
                            className="bg-green-500 hover:bg-green-600 active:bg-green-500 mt-10"
                        >
                            Go To Deployment
                        </Button>
                    </>
                )
            }
            {
                fail && (
                    <>
                        <CircleX className="w-20 h-20 text-red-500" />
                        <div className="text-lg font-semibold mt-4 select-none text-red-500">
                            Deployment Validation Failed
                        </div>
                        <Button
                            type="button"
                            onClick={() => { setValidated(false); setDeploymentId(null) }}
                            className="bg-blue-500 hover:bg-blue-600 active:bg-blue-500 mt-10"
                        >
                            Change Deployment Config
                        </Button>
                        <div className="my-2 text-gray-500">
                            or
                        </div>
                        <Button
                            type="button"
                            onClick={() => router.push(ROUTES.TEMPLATES)}
                            className="bg-red-500 hover:bg-red-600 active:bg-red-500"
                        >
                            Cancel Deployment
                        </Button>
                    </>
                )
            }
        </div>
    )
}

export default ValidateDeployment