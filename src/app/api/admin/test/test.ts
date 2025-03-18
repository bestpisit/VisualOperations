// export const dynamic = 'force-dynamic';

// import deploymentQueueManager from '@/lib/core/project/DeploymentQueueManager';
// import { CustomDeployment } from '@/lib/core/project/DeploymentService';
// import { ProjectManagement } from '@/lib/core/project/ProjectManagement';
// import { withAPIHandler, withAuthAndSuperAdmin } from '@/lib/middleware/apiWithMiddleware';
// import prisma from '@/lib/prisma';
// import { DeploymentQueueType, DeploymentType } from '@/types/PlatformStructure';

// export const GET = withAPIHandler(withAuthAndSuperAdmin(async (req) => {
//     try {
//         // await ProjectManagement.getProject('test1').terraformInstance.generateOutputFile(DeploymentType.InfrastructureConfiguration);
//         // await ProjectManagement.getProject('test1').projectResourceQuotaManager.updateProjectResourceUsage();
//         // await ProjectManagement.getProject('test').deploymentInstance.startDeployment('cm7ynma0w000rvves4knh8z2d');
//         await ProjectManagement.getProject('test').terraformInstance.generateOutputFile(DeploymentType.Infrastructure);
//         await deploymentQueueManager.enqueue('test', null, DeploymentQueueType.Refresh);
//         // const deployment = await prisma.deployment.findFirst({
//         //     where: {
//         //         id: 'cm7vnnesr002tvv18n372ryk7'
//         //     },
//         //     include: {
//         //         template: {
//         //             select: {
//         //                 details: true,
//         //                 TemplateProviders: {
//         //                     select: {
//         //                         providerId: true
//         //                     }
//         //                 }
//         //             }
//         //         }
//         //     }
//         // }) as CustomDeployment;
//         // await ProjectManagement.getProject('test1').terraformInstance.generateDeploymentFile(deployment);
//         // await ProjectManagement.getProject('test').terraformInstance.generateDeploymentFile(deployment);
//         return Response.json({ message: 'Test Successfully' });
//     } catch (e: any) {
//         console.error('Unexpected error:', e);
//         return Response.json({ error: 'Internal Server Error' }, { status: 500 });
//     }
// }));