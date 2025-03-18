import { getDeployment } from "@/app/api/projects/[projectUUID]/deployments/[deploymentId]/function";
import { withAuthAndRBACServer } from "@/lib/middleware/serverWithMiddleware";
import { PermissionTypes } from "@/types/prisma/RBACTypes";
import DeploymentPage from "./DeploymentPage";
import { ROUTES } from "@/lib/route";
import { redirect } from "next/navigation";

const SSRDeploymentPage = async ({
    params,
}: {
    params: { deploymentId: string, uuid: string };
}) => {
    await withAuthAndRBACServer([PermissionTypes.ProjectRead],{
        Project: {
            Deployment: {
                some: {
                    id: params.deploymentId
                }
            }
        }
    });

    const deployment = await getDeployment(params.deploymentId);

    if (!deployment) {
        return redirect(ROUTES.PROJECT_DEPLOYMENTS(params.uuid));
    }
    
    return (
        <DeploymentPage deployment={deployment} projectUUID={params.uuid} preDeploymentState={deployment.preDeploymentState || []} postDeploymentState={deployment.postDeploymentState || []}/>
    )
}

export default SSRDeploymentPage