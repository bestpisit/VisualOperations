import { useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import axios from "axios";
import { useRouter } from "next/navigation";
import LoadingSpinner from '@/components/LoadingSpinner';
import { CustomGetDeployment } from '@/app/api/projects/[projectUUID]/deployments/[deploymentId]/function';
import { Trash2, X } from 'lucide-react';

interface ConfirmCancelDialogProps {
    projectUuid: string;
    deploymentId: string;
    deployment: CustomGetDeployment;
    failed?: boolean;
}

const CancelDeploymentDialog: React.FC<ConfirmCancelDialogProps> = ({ projectUuid, deploymentId, deployment, failed }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    const handleCancelDeployment = async () => {
        setIsPending(true);
        try {
            let response = null as any;
            if (deployment.destroy) {
                response = await axios.post(`/api/projects/${projectUuid}/deployments/${deploymentId}/undo`);
            } else {
                response = await axios.delete(`/api/projects/${projectUuid}/deployments/${deploymentId}`);
            }
            if (response.status === 200) {
                toast.success("Cancel deployment successfully");
                router.push(`/projects/${projectUuid}/deployments`);
                setIsOpen(false);
            } else {
                toast.error("Failed to cancel deployment");
            }
        } catch {
            toast.error("Failed to cancel deployment");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !isPending && setIsOpen(open)}>
                <DialogTrigger asChild>
                    <div>
                        {!failed &&
                            <Button variant="destructive">
                                <X />
                                Cancel Deployment
                            </Button>}
                        {failed &&
                            <Button variant="destructive">
                                <Trash2 />
                                Cancel & Delete Deployment
                            </Button>}
                    </div>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancel Deployment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this deployment? This action cannot be undone.
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
                            variant="destructive"
                            disabled={isPending}
                            onClick={handleCancelDeployment}
                        >
                            {isPending ? (
                                <>
                                    <LoadingSpinner size="h-4 w-4" className="mr-2" />
                                    Cancelling...
                                </>
                            ) : (
                                "Confirm Cancel"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CancelDeploymentDialog;
