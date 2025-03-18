import crypto from 'crypto';
import prisma from '../prisma';
import { ApiError } from '@/types/api/apiError';
import { Deployment, Provider } from '@prisma/client';

export const ENCRYPTION_KEY = process.env.SERVER_ROOT_KEY || '75ae72c171de66c15a0a32ccdeca98c49656817b2322ede8297b24d126677bf5'; // Current encryption key
const ALGORITHM = 'aes-256-gcm'; // Algorithm used for encryption

export type SecretConnection =
    | { deploymentId: Deployment['id']; providerId?: never }
    | { providerId: Provider['uuid']; deploymentId?: never };

export class SecurityManager {
    static async encryptData(plainText: string) {
        const iv = crypto.randomBytes(12); // Generate a unique 12-byte IV
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag().toString('hex');

        const secret = await prisma.secret.create({
            data: {
                iv: iv.toString('hex'),
                tag,
                secret: encrypted
            }
        });

        return secret.id;
    }
    static async decryptData(secretId: string, secretConnection: SecretConnection) {
        const secret = await prisma.secret.findUnique({ where: { id: secretId } });

        if (!secret) throw ApiError.notFound('Secret not found');

        if (secretConnection) {
            let hasAccess = false;

            if (secretConnection.deploymentId) {
                // Check direct access via deploymentId
                hasAccess = secret.deploymentId === secretConnection.deploymentId;

                if (!hasAccess && secret.deploymentId) {
                    // Fetch all descendant deployments
                    const descendantDeployments = await this.getAllDescendantDeployments(secretConnection.deploymentId);

                    // Check if the secret's deploymentId matches any descendant deployment's ID
                    hasAccess = descendantDeployments.includes(secret.deploymentId);
                }
            } else if (secretConnection.providerId) {
                // Check direct access via providerId
                hasAccess = secret.providerId === secretConnection.providerId;
            }

            //projectSpecific Permissions
            if (!hasAccess) {
                const secret = await prisma.secret.findUnique({ where: { id: secretId } });
                if (secret?.providerId) {
                    const provider = await prisma.provider.findUnique({ where: { uuid: secret.providerId } });
                    if (secretConnection.deploymentId) {
                        const project = await prisma.project.findFirst({ where: { Deployment: { some: { id: secretConnection.deploymentId } },
                        ProjectProvider: {
                            some: {
                                provider: {
                                    uuid: provider?.uuid
                                }
                            }
                        }
                        } });
                        if (project) {
                            hasAccess = true;
                        }
                    }
                    //Todo if provider connect to provider in the same project
                }
                else if (secret?.deploymentId) {
                    const deployment = await prisma.deployment.findUnique({ where: { id: secret.deploymentId } });
                    if (secretConnection.deploymentId) {
                        const project = await prisma.project.findFirst({ where: { Deployment: { some: { id: secretConnection.deploymentId } } } });
                        if (project && deployment?.projectId && project.uuid === deployment?.projectId) {
                            hasAccess = true;
                        }
                    }
                    else if (secretConnection.providerId) {
                        const projectProvider = await prisma.projectProvider.findFirst({ where: { provider: { uuid: secretConnection.providerId } }, select: {provider: {
                            select: {
                                uuid: true
                            }
                        }} });
                        if (projectProvider && deployment?.projectId && projectProvider.provider.uuid === deployment?.projectId) {
                            hasAccess = true;
                        }
                    }
                }
            }

            if (!hasAccess) {
                // hasAccess = true;
                console.error('Access denied');
                throw ApiError.forbidden('Access denied');
            }
        }

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(secret.iv, 'hex'));
        decipher.setAuthTag(Buffer.from(secret.tag, 'hex'));

        let decrypted = decipher.update(secret.secret, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    static validateKey(key: string) {
        if (Buffer.from(key, 'hex').length !== 32) {
            throw new Error('Invalid encryption key length. Ensure it is 32 bytes in hex.');
        }
    }
    static encryptDataWithKey(plainText: string, encryptionKey: string) {
        this.validateKey(encryptionKey);

        const iv = crypto.randomBytes(12); // Generate a unique 12-byte IV
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);

        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag().toString('hex');

        return { encrypted, iv: iv.toString('hex'), tag };
    }
    static decryptDataWithKey(encrypted: string, iv: string, tag: string, encryptionKey: string) {
        this.validateKey(encryptionKey);

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(tag, 'hex'));

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    // Helper function to recursively retrieve all descendant deployments
    static async getAllDescendantDeployments(deploymentId: string): Promise<string[]> {
        const descendantIds: string[] = []; // Store all descendant IDs
        const queue: string[] = [deploymentId]; // Initialize a queue with the root deployment ID

        while (queue.length > 0) {
            const currentId = queue.shift()!; // Dequeue an ID
            const childDeployments = await prisma.deployment.findMany({
                where: { parentDeploymentId: currentId },
                select: { id: true },
            });

            // Gather IDs of the child deployments
            const childIds = childDeployments.map(child => child.id);
            descendantIds.push(...childIds); // Add child IDs to the result
            queue.push(...childIds); // Enqueue child IDs for further exploration
        }

        return descendantIds;
    }
}