'use client';

import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, CheckCircle, GitPullRequest, ShieldCheck, Layers } from 'lucide-react';
import { useRouter as useNRouter } from 'next-nprogress-bar';
import { toast } from 'react-toastify';
import LogSection from '@/components/logs/LogSection';
import { DeploymentLogs, DeploymentStatus, InputTypes } from '@/types/PlatformStructure';
import { useParams } from 'next/navigation';
import { useProjectContext } from '@/lib/context/ProjectContext';
import axios from 'axios';
import { ROUTES } from '@/lib/route';
import { handleApiError } from '@/types/api/apiError';
import { CustomGetDeployment } from '@/app/api/projects/[projectUUID]/deployments/[deploymentId]/function';
import { formatCustomDate, formatTime } from '@/lib/utils';
import CancelDeploymentDialog from './CancelDeploymentDialog';
import LoadingSpinner from "@/components/LoadingSpinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Visualization from "@/components/visualization/Visualization";
import { Project } from "@prisma/client";

const stages = ['Pre-deployment', 'Deployment', 'Post-deployment'] as const;
type Stage = typeof stages[number];

const DeploymentPage = ({ deployment, projectUUID, preDeploymentState, postDeploymentState }: { deployment: CustomGetDeployment, projectUUID: Project['uuid'], preDeploymentState: any, postDeploymentState: any }) => {
    const [progress, setProgress] = useState(0);
    const [isDeploying, setIsDeploying] = useState(false);
    const [logs, setLogs] = useState<Record<string, DeploymentLogs[]>>();
    const [stage, setStage] = useState<Stage>(() => {
        if (deployment.status === DeploymentStatus.Pending || deployment.status === DeploymentStatus.Queued) {
            return 'Pre-deployment';
        }
        else if (deployment.status === DeploymentStatus.Running) {
            return 'Deployment';
        }
        else if (deployment.status === DeploymentStatus.Completed || deployment.status === DeploymentStatus.Failed) {
            return 'Post-deployment';
        }
        return 'Pre-deployment';
    });
    const [isCompleted, setIsCompleted] = useState(false);
    const [postDeploymentDiagramData,setPostDeploymentDiagramData] = useState(postDeploymentState || []);
    const [preDeploymentTab, setPreDeploymentTab] = useState('SystemDiagram');
    const { project } = useProjectContext();
    const { deploymentId } = useParams();

    useEffect(() => {
        if (deployment.status === DeploymentStatus.Running) {
            pollDeploymentStatus();
        }
        if (deployment.planOutput) {
            // Strip ANSI codes from logs
            Object.keys(deployment.planOutput).forEach((key) => {
                deployment.planOutput[key] = deployment.planOutput[key].map((log: DeploymentLogs) => {
                    log.message = stripAnsiCodes(log.message);
                    if (log.timestamp) {
                        log.timestamp = new Date(log?.timestamp);
                    }
                    return log;
                });
            });

            setLogs(deployment.planOutput);
        }
    }, [deployment]);

    const stripAnsiCodes = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, '');

    // const resources = [
    //     {
    //         name: 'Nginx',
    //         icons: [ImageInventory.Icon.Nginx],
    //         type: 'Application',
    //         description: 'Nginx Reverse Proxy',
    //     },
    //     {
    //         name: 'vm-gateway',
    //         icons: [ImageInventory.Icon.Server, ImageInventory.Icon.Nutanix],
    //         type: 'Infrastructure',
    //         description: 'Virtual Machine',
    //     },
    // ];

    const addLog = (message: string) => {
        setLogs((prevLogs) => {
            const newLogs = { ...prevLogs };
            const key = '';
            newLogs[key] = [{ message, stage: 'GG' }];
            return newLogs;
        });
    };

    const nrouter = useNRouter();

    const handleStartDeployment = async () => {
        setIsPending(true);
        setLogs({}); // Clear logs
        setProgress(0);
        setIsDeploying(true);
        setIsCompleted(false);
        setStage('Deployment');

        try {
            const response = await axios.post(`/api/projects/${project.uuid}/deployments/${deploymentId}`);

            // Check for specific status codes
            if (response.status === 401 || response.status === 403) {
                setIsDeploying(false);
                addLog('Unauthorized. Please log in with appropriate permissions.');
                toast.error('Unauthorized access.');
                return;
            }

            if (response.status === 409) {
                setIsDeploying(false);
                addLog('Deployment is already in progress.');
                toast.error('Deployment is already in progress.');
                return;
            }

            // Axios does not have an `ok` property like the Fetch API; use `status` instead
            if (response.status < 200 || response.status >= 300) {
                setIsDeploying(false);
                addLog('An error occurred while starting the deployment.');
                toast.error('Failed to start deployment.');
                return;
            }

            // Start polling for deployment status and logs
            pollDeploymentStatus();
        } catch (error: any) {
            setIsDeploying(false);

            // Handle error response more idiomatically with Axios
            if (error.response) {
                const message = handleApiError(error);
                // Server responded with a status code outside the range of 2xx
                addLog(`Deployment failed: ${error.response.status} [${error.response.statusText}] ${message}`);
                toast.error(`Deployment failed: ${message || 'Unknown error'}`);
            } else if (error.request) {
                // No response received from the server
                addLog('Deployment failed: No response received from the server.');
                toast.error('Deployment failed: No response from server.');
            } else {
                // Error setting up the request
                addLog(`Deployment failed: ${error.message}`);
                toast.error(`Deployment failed: ${error.message}`);
            }
        }
        setIsOpen(false);
        setIsFailedOpen(false);
        setIsPending(false);
    };

    const [isOpen, setIsOpen] = useState(false);
    const [isFailedOpen, setIsFailedOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const pollDeploymentStatus = () => {
        const pollInterval = 1000; // Poll every second

        const intervalId = setInterval(async () => {
            try {
                const response = await axios.get(`/api/projects/${project.uuid}/deployments/${deploymentId}/logs`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    withCredentials: true, // Includes credentials in the request
                });

                if (response.status === 401 || response.status === 403) {
                    setIsDeploying(false);
                    addLog('Unauthorized. Please log in with appropriate permissions.');
                    toast.error('Unauthorized access.');
                    clearInterval(intervalId);
                    return;
                }

                // Axios does not have an `ok` property like the Fetch API
                if (response.status < 200 || response.status >= 300) {
                    setIsDeploying(false);
                    addLog('An error occurred while fetching deployment status.');
                    toast.error('Failed to fetch deployment status.');
                    clearInterval(intervalId);
                    return;
                }

                const { status, logs, postDeploymentState }: { status: DeploymentStatus, logs: any, postDeploymentState: any } = response.data;

                // Strip ANSI codes from logs
                Object.keys(logs).forEach((key) => {
                    logs[key] = logs[key].map((log: DeploymentLogs) => {
                        log.message = stripAnsiCodes(log.message);
                        if (log.timestamp) {
                            log.timestamp = new Date(log?.timestamp);
                        }
                        return log;
                    });
                });

                setLogs(logs);

                if (postDeploymentState) {
                    setPostDeploymentDiagramData(postDeploymentState);
                }

                deployment.status = status;
                if (status === DeploymentStatus.Running) {
                    setProgress((prevProgress) => Math.min(prevProgress + 1, 99));
                } else if (status === DeploymentStatus.Completed) {
                    setIsDeploying(false);
                    setIsCompleted(true);
                    setProgress(100);
                    addLog('Deployment finished successfully.');
                    setStage('Post-deployment');
                    clearInterval(intervalId);
                } else if (status === DeploymentStatus.Failed) {
                    setIsDeploying(false);
                    setIsCompleted(false);
                    setProgress(100);
                    addLog('Deployment failed.');
                    toast.error('Deployment failed.');
                    clearInterval(intervalId);
                }
            } catch (error: any) {
                setIsDeploying(false);

                if (error.response) {
                    addLog(`Error fetching deployment status: ${error.response.status} ${error.response.statusText}`);
                    toast.error(`Error fetching deployment status: ${error.response.data?.message || 'Unknown error'}`);
                } else if (error.request) {
                    addLog('Error fetching deployment status: No response from server.');
                    toast.error('Error fetching deployment status: No response from server.');
                } else {
                    addLog(`Error fetching deployment status: ${error.message}`);
                    toast.error(`Error fetching deployment status: ${error.message}`);
                }

                clearInterval(intervalId);
            }
        }, pollInterval);
    };

    const fetchDeploymentLogs = async () => {
        try {
            const response = await axios.get(`/api/projects/${project.uuid}/deployments/${deploymentId}/logs`);

            if (response.status === 401 || response.status === 403) {
                addLog('Unauthorized. Please log in with appropriate permissions.');
                toast.error('Unauthorized access.');
                return;
            }

            if (response.status < 200 || response.status >= 300) {
                addLog('An error occurred while fetching deployment logs.');
                toast.error('Failed to fetch deployment logs.');
                return;
            }

            const { logs }: { logs: any } = response.data;

            // Strip ANSI codes from logs
            Object.keys(logs).forEach((key) => {
                logs[key] = logs[key].map((log: DeploymentLogs) => {
                    log.message = stripAnsiCodes(log.message);
                    if (log.timestamp) {
                        log.timestamp = new Date(log?.timestamp);
                    }
                    return log;
                });
            });

            setLogs(logs);
        } catch (error: any) {
            if (error.response) {
                addLog(`Error fetching deployment logs: ${error.response.status} ${error.response.statusText}`);
                toast.error(`Error fetching deployment logs: ${error.response.data?.message || 'Unknown error'}`);
            } else if (error.request) {
                addLog('Error fetching deployment logs: No response from server.');
                toast.error('Error fetching deployment logs: No response from server.');
            } else {
                addLog(`Error fetching deployment logs: ${error.message}`);
                toast.error(`Error fetching deployment logs: ${error.message}`);
            }
        }
    };

    const handleStageChange = (selectedStage: Stage) => {
        if (selectedStage === 'Deployment' && (deployment.status === DeploymentStatus.Completed || deployment.status === DeploymentStatus.Failed)) {
            setStage(selectedStage);
            fetchDeploymentLogs();
            return;
        }
        else if (selectedStage === 'Post-deployment' && (deployment.status === DeploymentStatus.Completed || deployment.status === DeploymentStatus.Failed)) {
            setStage(selectedStage);
            return;
        }
        if (
            isCompleted ||
            (!isDeploying && stages.indexOf(selectedStage) <= stages.indexOf(stage))
        ) {
            setStage(selectedStage);
        }
    };

    const stageClass = (selectedStage: Stage) => {
        if (stage === selectedStage) {
            return 'bg-indigo-600 text-white shadow-md'; // Active stage
        } else if (stages.indexOf(selectedStage) < stages.indexOf(stage)) {
            return 'bg-white text-black shadow-md'; // Completed stages
        } else {
            if (deployment.status === DeploymentStatus.Completed || deployment.status === DeploymentStatus.Failed) {
                return 'bg-white shadow-md'; // Future stages or disabled ones
            }
            return 'bg-gray-200 shadow-md'; // Future stages or disabled ones
        }
    };

    // Scroll to bottom of logs
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    useEffect(() => {
        if (autoScroll) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    // Handle user scrolling
    const handleScroll = (e: React.UIEvent<HTMLPreElement>) => {
        const element = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = element;

        // You can adjust the threshold if desired
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;
        setAutoScroll(isAtBottom);
    };

    const statusDeployment = (status: DeploymentStatus) => {
        if (status === DeploymentStatus.Completed) {
            return 'text-green-600 bg-green-100';
        } else if (status === DeploymentStatus.Failed) {
            return 'text-red-600 bg-red-100';
        } else {
            return 'text-black bg-gray-100';
        }
    }

    // const handleDeleteDeployment = async (id: string) => {
    //     try {
    //         await axios.delete(`/api/projects/${project.uuid}/deployments/${id}`);
    //         toast.success('Deployment deleted successfully');
    //         if (deployment.status === DeploymentStatus.Failed) {
    //             nrouter.push(ROUTES.PROJECT_DEPLOYMENTS(project.uuid));
    //         }
    //     } catch (e) {
    //         toast.error(handleApiError(e) || 'Failed to delete deployment');
    //     }
    // }

    // const handleUndoDestroyDeployment = async (id: string) => {
    //     try {
    //         await axios.post(`/api/projects/${project.uuid}/deployments/${id}/undo`);
    //         toast.success('Deployment undo destroy successfully');
    //         if (deployment.status === DeploymentStatus.Failed) {
    //             nrouter.push(ROUTES.PROJECT_DEPLOYMENTS(project.uuid));
    //         }
    //     } catch (e) {
    //         toast.error(handleApiError(e) || 'Failed to undo destroy deployment');
    //     }
    // }

    return (
        <div className="flex flex-grow bg-gray-100 overflow-auto border-l">
            {/* Sidebar with Run Details */}
            <div className="w-1/3 bg-gray-50 shadow-lg p-4 flex flex-col gap-4">
                <div className="bg-white shadow-md p-4 space-y-2">
                    <h1 className="font-bold text-xl mb-4">Deployment Details</h1>
                    <p>
                        <strong>Project:</strong> {deployment.project?.name}
                    </p>
                    <p>
                        <strong>Status:</strong>{' '}
                        <span className={`px-2 py-1 rounded-md ${statusDeployment(deployment.status as DeploymentStatus)}`}>
                            {deployment.status}
                        </span>
                    </p>
                    <p>
                        <strong>Triggered at:</strong> {formatCustomDate(new Date(deployment.updatedAt)) + ','} {formatTime(new Date(deployment.updatedAt))}
                    </p>
                    <p>
                        <strong>Deployer:</strong> {deployment.user?.name || 'Unknown'}
                    </p>
                </div>

                <div className="mt-6">
                    {stages.map((stg) => {
                        let Icon = GitPullRequest; // Default icon
                        let cursor = 'cursor-pointer';
                        if (deployment.status === DeploymentStatus.Completed || deployment.status === DeploymentStatus.Failed) {
                            Icon = CheckCircle; // Show CheckCircle for completed stages
                        }
                        else if (stg === stage) {
                            Icon = PlayCircle; // Show PlayCircle for the current stage
                        } else if (stages.indexOf(stg) < stages.indexOf(stage)) {
                            Icon = CheckCircle; // Show CheckCircle for completed stages
                        } else {
                            cursor = 'cursor-not-allowed';
                        }

                        return (
                            <button
                                key={stg}
                                onClick={() => handleStageChange(stg)}
                                className={`flex items-center px-4 py-2 w-full mb-2 rounded-md ${stageClass(stg)} ${cursor}`}
                            >
                                <Icon className="mr-2 w-5 h-5" />
                                {stg}
                            </button>
                        );
                    })}
                </div>

                {/* Things to deploy */}
                <h2 className="font-bold text-lg">Deployment Configuration</h2>
                <div className="mt-2 flex-grow flex flex-col overflow-auto rounded-lg">
                    {deployment.config &&
                        <Table
                            className="min-w-full flex-grow bg-white shadow-md rounded-lg"
                            style={{ tableLayout: 'fixed' }}
                        >
                            <TableHeader className="bg-gray-200 rounded-t-md">
                                <TableHead className="px-4 py-2 text-center">Name</TableHead>
                                <TableHead className="px-4 py-2 text-center">Value</TableHead>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(deployment.config).filter(c => c[1].value && c[1].type !== InputTypes.Providers).map((c, index) => (
                                    <TableRow key={index} className="border-b overflow-auto">
                                        <TableCell className="px-4 pl-2 py-2 flex gap-2">
                                            <p className="text-black whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer">
                                                {c[0]}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis">
                                            {c[1].secret ? "*****" : JSON.stringify(c[1].value)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    }
                </div>

                {deployment.status === DeploymentStatus.Pending && (
                    <div className='flex justify-between mt-auto'>
                        <CancelDeploymentDialog projectUuid={project.uuid} deployment={deployment} deploymentId={deploymentId as string} />
                        <Dialog open={isOpen} onOpenChange={(open) => !isPending && setIsOpen(open)}>
                            <DialogTrigger asChild>
                                <Button variant="default" className="bg-green-500 hover:bg-green-600 active:bg-green-500">
                                    <ShieldCheck />
                                    Approve & Start Deployment
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Approve & Start Deployment</DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to start this deployment? This action cannot be undone.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        disabled={isPending}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        variant="default"
                                        disabled={isPending}
                                        onClick={handleStartDeployment}
                                        className="bg-green-500 hover:bg-green-600 active:bg-green-500"
                                    >
                                        {isPending ? (
                                            <>
                                                <LoadingSpinner size="h-4 w-4" className="mr-2" />
                                                Starting...
                                            </>
                                        ) : (
                                            "Start Deployment"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {deployment.status === DeploymentStatus.Failed && (
                    <div className='flex justify-between mt-auto'>
                        <CancelDeploymentDialog projectUuid={project.uuid} deployment={deployment} deploymentId={deploymentId as string} failed={deployment.status === DeploymentStatus.Failed} />
                        <Dialog open={isFailedOpen} onOpenChange={(open) => !isPending && setIsFailedOpen(open)}>
                            <DialogTrigger asChild>
                                <Button variant="default" className="bg-orange-500 hover:bg-orange-600 active:bg-orange-500">
                                    <ShieldCheck />
                                    Rerun Failed Deployment
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Rerun Failed Deployment</DialogTitle>
                                    <DialogDescription>
                                        Are you sure you want to rerun this failed deployment? if not please Cancel & Delete Deployment
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        disabled={isPending}
                                        onClick={() => setIsFailedOpen(false)}
                                    >
                                        Close
                                    </Button>
                                    <Button
                                        variant="default"
                                        disabled={isPending}
                                        onClick={handleStartDeployment}
                                        className="bg-orange-500 hover:bg-orange-600 active:bg-orange-500"
                                    >
                                        {isPending ? (
                                            <>
                                                <LoadingSpinner size="h-4 w-4" className="mr-2" />
                                                Pending...
                                            </>
                                        ) : (
                                            "Rerun Failed Deployment"
                                        )}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}

                {(deployment.status === DeploymentStatus.Completed) && (
                    <button
                        onClick={() => {
                            nrouter.push(ROUTES.PROJECT(project.uuid));
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded shadow-md hover:bg-green-500 transition-all mt-auto flex justify-center items-center"
                    >
                        <Layers className="w-5 h-5 mr-2" />
                        Go To Project Overview
                    </button>
                )}
            </div>

            {/* Main Content */}
            <div className="w-2/3 bg-gray-50 p-4 flex flex-col flex-grow">
                <div className="bg-white shadow-md overflow-y-auto flex flex-col flex-grow">
                    <h2 className="font-bold text-lg m-3 mb-2">{stage} Stage</h2>

                    {!isDeploying && stage === 'Pre-deployment' && (
                        <div className="border-b">
                            <button
                                onClick={() => setPreDeploymentTab('SystemDiagram')}
                                className={`px-4 py-2 mr-2 ${preDeploymentTab === 'SystemDiagram'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200'
                                    }`}
                            >
                                System Diagram
                            </button>
                            <button
                                onClick={() => setPreDeploymentTab('PlanDiagram')}
                                className={`px-4 py-2 ${preDeploymentTab === 'PlanDiagram'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-200'
                                    }`}
                            >
                                Deployment Plan
                            </button>
                        </div>
                    )}

                    {/* Pre-deployment diagrams */}
                    {stage === 'Pre-deployment' && (
                        <div className='flex-grow flex justify-center items-center'>
                            {preDeploymentTab === 'SystemDiagram' ? (
                                <Visualization elements={preDeploymentState} projectUUID={projectUUID}/>
                            ) : (
                                <pre
                                    className="font-mono w-full h-full flex-grow overflow-y-auto bg-white rounded-md border"
                                    onScroll={handleScroll}
                                >
                                    {/* Render logs here */}
                                    {logs && Object.keys(logs).map((key, index) => (
                                        <LogSection key={index} title={key} logs={logs[key]} />
                                    ))}
                                    <div ref={logsEndRef} />
                                </pre>
                            )}
                        </div>
                    )}

                    {stage === 'Deployment' && (
                        <pre
                            className="font-mono w-full h-full flex-grow overflow-y-auto bg-white rounded-md border"
                            onScroll={handleScroll}
                        >
                            {/* Render logs here */}
                            {logs && Object.keys(logs).map((key, index) => (
                                <LogSection key={index} title={key} logs={logs[key]} />
                            ))}
                            <div ref={logsEndRef} />
                        </pre>
                    )}

                    {/* Post-deployment diagram */}
                    {stage === 'Post-deployment' && postDeploymentDiagramData && (
                        <Visualization elements={postDeploymentDiagramData} projectUUID={projectUUID}/>
                    )}

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className={`h-2.5 transition-all duration-300 ${stage === 'Deployment' ? 'bg-blue-500' : 'bg-green-500'
                                }`}
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeploymentPage;
