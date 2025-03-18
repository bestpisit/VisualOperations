import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { DeploymentType, PlatformPaths, PlatformStructure, TerraformOutput } from '@/types/PlatformStructure';
import pino from 'pino';
import prisma from '@/lib/prisma';
import { parsePrismaJson } from '@/lib/utility/prismaUtility';
import { JsonObject } from '@prisma/client/runtime/library';
import { ApiError } from '@/types/api/apiError';

export interface DeploymentLogs {
    message: string;
    timestamp: Date;
    stage: string;
}

interface ExecuteTerraformOutputType {
    code: number;
    output: string;
}

interface TerraformOutputType {
    code: number;
    output: TerraformOutput;
}

class TerraformService {
    private workingDir: string;
    private deploymentId: string | undefined | null;
    private deploymentPlan: boolean = false;

    // Use pino for console logs (optional)
    private static logger = pino({ level: process.env.LOG_LEVEL || 'info' });

    // In-memory buffer for log messages
    private logBuffer: DeploymentLogs[] = [];

    // Interval reference for flushing logs
    private flushInterval: NodeJS.Timeout | null = null;

    // How often to flush logs to DB (in ms). Tune to your needs.
    private readonly FLUSH_INTERVAL_MS = 1000;

    constructor(projectUUID: string, deploymentId: string | undefined, deploymentType: DeploymentType, plan: boolean = false) {
        this.workingDir = path.join(PlatformPaths.PROJECTS, projectUUID, PlatformStructure.TerraformFolder, deploymentType);
        this.deploymentId = deploymentId;
        this.deploymentPlan = plan;
        this.ensureTerraformFolderExists();

        // Start the periodic flush
        this.startPeriodicFlush();
    }

    /**
     * Ensures the Terraform folder exists.
     */
    private ensureTerraformFolderExists(): void {
        if (!fs.existsSync(this.workingDir)) {
            fs.mkdirSync(this.workingDir, { recursive: true });
            console.log(`Terraform folder created at: ${this.workingDir}`);
        }
    }

    /**
     * Push a log message into the in-memory buffer only.
     * We also stamp the message with a timestamp.
     */
    logMessage(message: string, stage: string) {
        const formattedMessage: DeploymentLogs = {
            message,
            timestamp: new Date(),
            stage,
        };

        // Push into the buffer (don't write to DB immediately)
        this.logBuffer.push(formattedMessage);

        // Optionally log to console (pino)
        TerraformService.logger.info({ message: formattedMessage });
    }

    /**
     * Periodically flush the log buffer to Prisma in one batch.
     */
    private startPeriodicFlush() {
        // Clear any existing interval (just in case)
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }

        // Set interval to flush logs every X milliseconds
        this.flushInterval = setInterval(() => {
            void this.flushLogBuffer();
        }, this.FLUSH_INTERVAL_MS) as unknown as NodeJS.Timeout;        
    }

    /**
     * Flush the current log buffer to the database in a single update.
     */
    private async flushLogBuffer() {
        if (this.logBuffer.length === 0) {
            return; // Nothing to flush
        }

        // Copy current buffer and reset
        const bufferToFlush = [...this.logBuffer];
        this.logBuffer = [];

        try {
            if (!this.deploymentId) {
                return;
            }
            // Fetch current deployment
            const deployment = await prisma.deployment.findUnique({
                where: { id: this.deploymentId },
            });

            if (!deployment) {
                throw new Error('Deployment not found');
            }

            // Parse existing logs from JSON column
            const deploymentLogs = (await parsePrismaJson(deployment.logs)) as JsonObject;

            // Group new logs by stage so we can push them in
            bufferToFlush.forEach((log) => {
                if (!deploymentLogs[log.stage]) {
                    deploymentLogs[log.stage] = [];
                }
                (deploymentLogs[log.stage] as unknown as DeploymentLogs[]).push(log);
            });

            // Write once to DB
            await prisma.deployment.update({
                where: { id: this.deploymentId },
                data: {
                    ...(this.deploymentPlan ? { planOutput: JSON.parse(JSON.stringify(deploymentLogs)) } : {}),
                    logs: JSON.parse(JSON.stringify(deploymentLogs)),
                },
            });
        } catch (err) {
            // In production, you might want to handle this differently (retry, etc.)
            console.error('Error flushing logs to DB:', err);
        }
    }

    /**
     * Stop the periodic flush if needed (e.g., if the object is destroyed).
     */
    private stopPeriodicFlush() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }

    /**
     * Execute a Terraform command, capturing stdout/stderr in the log buffer.
     */
    executeTerraformCommand = (
        command: string[],
        stage: string,
        environmentVariables?: { key: string; value: string }[],
        doLogMessage: boolean = true
    ) =>
        new Promise<ExecuteTerraformOutputType>((resolve, reject) => {
            const env = {
                ...process.env,
                ...(environmentVariables
                    ? Object.fromEntries(environmentVariables.map(({ key, value }) => [`TF_VAR_${key}`, value]))
                    : {}),
            };

            let outputData = '';

            const terraform = spawn('terraform', command, {
                cwd: this.workingDir,
                env,
            });

            TerraformService.logger.info({ command }, `Executing Terraform ${stage} command`);

            terraform.stdout.on('data', (data) => {
                const message = data.toString();
                outputData += message;
                if (doLogMessage) {
                    this.logMessage(message, stage);
                }
            });

            terraform.stderr.on('data', (data) => {
                const message = data.toString();
                outputData += message;
                if (doLogMessage) {
                    this.logMessage(message, stage);
                }
            });

            terraform.on('close', async (code) => {
                if (doLogMessage) {
                    this.logMessage(`Command completed with exit code ${code}`, stage);
                }

                // Final flush after the command finishes
                await this.flushLogBuffer();

                resolve({ code: code || 0, output: outputData.trim() });
            });

            terraform.on('error', async (err) => {
                if (doLogMessage) {
                    this.logMessage(`Error executing Terraform: ${err.message}`, stage);
                }

                // Final flush on error as well
                await this.flushLogBuffer();

                reject(new Error(`Error executing Terraform: ${err.message}`));
            });
        });

    /**
     * Example: Retrieve Terraform output (parsed as JSON).
     */
    async getTerraformOutput(): Promise<TerraformOutput> {
        try {
            const { output } = await this.executeTerraformCommand(['output', '-json'], 'Fetch Terraform Output', undefined, false);
            return JSON.parse(output);
        } catch (error: any) {
            this.logMessage('Failed to parse Terraform output', 'Fetch Terraform Output');
            throw ApiError.internalServerError('Failed to parse Terraform output: ' + error.message);
        }
    }

    /**
     * Example: Start deployment (apply).
     */
    async startDeployment(environmentVariables?: { key: string; value: string }[], doLogMessage?: boolean): Promise<TerraformOutputType> {
        const { code: applyCode } = await this.executeTerraformCommand(['apply', '--auto-approve'], 'Start Deployments', environmentVariables, !!doLogMessage);
        this.logMessage(`Terraform apply completed with exit code ${applyCode}`, 'Start Deployments');

        if (applyCode !== 0) {
            throw ApiError.internalServerError('Terraform apply failed');
        }

        const outputJson = await this.getTerraformOutput();
        return { code: applyCode, output: outputJson };
    }

    /**
     * Example: Terraform plan
     */
    async planDeployment(environmentVariables?: { key: string; value: string }[], doLogMessage?: boolean): Promise<TerraformOutputType> {
        this.logMessage('Planning Terraform...', 'Plan Deployment');

        const { code: planCode } = await this.executeTerraformCommand(['plan','--out=plan.out'], 'Plan Deployment', environmentVariables, !!doLogMessage);
        this.logMessage(`Terraform plan completed with exit code ${planCode}`, 'Plan Deployment');

        if (planCode !== 0) {
            throw ApiError.internalServerError('Terraform plan failed');
        }

        const { code: planOutputCode, output } = await this.executeTerraformCommand(['show','-json','plan.out'], 'Plan Deployment', undefined, false);
        this.logMessage(`Terraform plan json completed with exit code ${planOutputCode}`, 'Plan Deployment');

        return { code: planCode, output: JSON.parse(output) };
    }

    /**
     * Example: Terraform refresh
     */
    async refreshDeployment(environmentVariables: { key: string; value: string }[]): Promise<TerraformOutputType> {
        const { code: refreshCode } = await this.executeTerraformCommand(['refresh'], 'Refresh Deployment', environmentVariables);

        if (refreshCode !== 0) {
            throw ApiError.internalServerError('Terraform refresh failed');
        }

        const outputJson = await this.getTerraformOutput();
        return { code: refreshCode, output: outputJson };
    }

    /**
     * Example: Terraform init
     */
    async terraformInit(doLogMessage?: boolean): Promise<number> {
        if (doLogMessage) this.logMessage('Starting Terraform operations', 'Pre-deployment');

        if (doLogMessage) this.logMessage('Initializing Terraform...', 'Setup Environment');
        const { code } = await this.executeTerraformCommand(['init'], 'Setup Environment', undefined, !!doLogMessage);
        if (doLogMessage) this.logMessage(`Terraform init completed with exit code ${code}`, 'Setup Environment');

        if (code !== 0) {
            throw ApiError.internalServerError('Terraform init failed ' + code);
        }
        return code;
    }

    /**
     * Example: Terraform validate
     */
    async terraformValidate(doLogMessage?: boolean): Promise<number> {
        if (doLogMessage) this.logMessage('Validating Terraform...', 'Setup Environment');
        const { code } = await this.executeTerraformCommand(['validate'], 'Setup Environment', undefined, !!doLogMessage);
        if (doLogMessage) this.logMessage(`Terraform validate completed with exit code ${code}`, 'Setup Environment');

        if (code !== 0) {
            throw ApiError.internalServerError('Terraform validate failed ' + code);
        }
        return code;
    }

    /**
     * If needed, call this when the service is destroyed or no longer used
     * to ensure final flush and stop the periodic interval.
     */
    async dispose() {
        // Final flush
        await this.flushLogBuffer();
        this.stopPeriodicFlush();
    }
}

export default TerraformService;