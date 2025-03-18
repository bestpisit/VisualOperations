import { Project, TerraformProvider } from '@prisma/client';
import path from 'path';

export enum DeploymentStatus {
    Waiting = "waiting",
    Planning = "planning",
    Pending = "pending",
    Queued = "queued",
    Running = "running",
    Completed = "completed",
    Failed = "failed",
    Invalid = "invalid",
}

export enum DeploymentType {
    Infrastructure = "infrastructure",
    InfrastructureConfiguration = "infrastructure-configuration",
    Application = "application",
    ApplicationConfiguration = "application-configuration",
    Undefined = "undefined"
}

export enum InputTypes {
    String = "string",
    Number = "number",
    Boolean = "boolean",
    Providers = "providers",
    Resource = "resource",
    Regex = "regex",
    List = "list",
    File = "file",
    Map = "map"
}

export enum OutputTypes {
    String = "string",
    Number = "number",
    Boolean = "boolean",
    List = "list"
}

export interface ProviderTerraform {
    source: string;
    version: string;
}

export interface ProviderTemplate {
    id: string; // Unique identifier for the configuration
    name: string; // Name of the configuration
    description: string; // Description of the configuration
    resourceProvider?: boolean; // Whether the provider is a resource provider
    terraform: ProviderTerraform;
    inputs: InputField[]; // Array of input fields for configuration
}

export interface InputField {
    name: string; // Name of the input field
    title: string; // Title or label for the input field
    type: InputTypes; // Type of the input field
    required: boolean; // Whether the input is required
    description: string; // Description of the input field
    secret?: boolean; // Whether the field is a secret (optional)
    default?: string | number; // Default value for the input field (optional)
    validation?: any; // Validation for the input field (optional)
    tags?: string[]; // Tags for the input field (optional)
    constraint?: string;
    configuration?: boolean;
    providerType?: string;
    dummy?: boolean;
    resourceTypes?: string[];
    quota?: boolean;
}

export interface OutputField {
    name: string; // Name of the output field
    type: OutputTypes; // Type of the output field
    sensitive: boolean; // Whether the output is sensitive
}

export interface ProviderConfiguration {
    [key: string]: {
        type: InputTypes;
        value: any;
        configuration?: boolean;
        secret?: boolean;
        providerId: string;
    };
}

export interface ProviderConfigurationChange {
    [key: string]: {
        value: any;
    };
}

export interface DeploymentTemplate {
    id: string; // Unique identifier for the configuration
    name: string; // Name of the configuration
    type: DeploymentType; // Type of the configuration (e.g., infrastructure)
    description: string; // Description of the configuration
    category: string; // Category of the configuration
    subcategory: string; // Subcategory of the configuration
    providers?: string[]; // List of providers (e.g., proxmox)
    inputs: InputField[]; // Array of input fields for configuration
    outputs?: OutputField[]; // Array of output fields for configuration
    resources?: ResourceConfiguration[];
    uniqueConstraints?: UniqueConstraintConfiguration[],
    resourceUsages?: ResourceUsageConfiguration[],
    tags?: string[];
    imageKey?: string[]; // Image key for Proxmox
}

export interface OutputConfiguration {
    [key: string]: {
        fromOutput: string;
    };
}

export interface ResourceConfiguration {
    name: {
        from: string;
    };
    config?: OutputConfiguration;
    provider?: {
        providerId: string;
        config: {
            [key: string]: {
                from: string
            }
        };
    }
}

export enum UniqueConstraintScope {
    Global = "global",
    Project = "project",
    Resource = "resource"
}

export interface UniqueConstraintConfiguration {
    [key: string]: {
        from: string;
        value?: string;
        scope?: UniqueConstraintScope;
        scopeFrom?: string;
    };
}

export interface ResourceUsageConfiguration {
    [key: string]: {
        from: string;
        value?: string;
    };
}

export interface DeploymentConfiguration {
    [key: string]: {
        type: InputTypes;
        value: any;
        configuration?: boolean;
        secret?: boolean;
        deploymentId: string;
    };
}

export enum PlatformStructure {
    DataFolder = "data",
    TemplatesFolder = "templates",
    ProvidersFolder = "providers",
    DeploymentsFolder = "deployments",
    ProjectsFolder = "projects",
    TerraformFolder = "terraform",
    ImagesFolder = "images",
}

export interface DeploymentLogs {
    message: string;
    timestamp?: Date;
    stage: string;
}

export interface ProjectResourceQuotaType {
    cpu: number; // vCPUs
    memory: number; // GB
    storage: number; // GB
    [key: string]: number; // Allow additional properties
}

export interface ResourceQuotaUsageType {
    cpu: number;
    memory: number;
    storage: number;
    [key: string]: number; // Allow additional properties
}

// Base paths
export const PlatformPaths = {
    BASE: process.cwd(),
    DATA: path.join(process.cwd(), PlatformStructure.DataFolder),

    TEMPLATES: path.join(process.cwd(), PlatformStructure.DataFolder, PlatformStructure.TemplatesFolder),
    PROVIDERS: path.join(process.cwd(), PlatformStructure.DataFolder, PlatformStructure.ProvidersFolder),
    DEPLOYMENTS: path.join(process.cwd(), PlatformStructure.DataFolder, PlatformStructure.DeploymentsFolder),
    PROJECTS: path.join(process.cwd(), PlatformStructure.DataFolder, PlatformStructure.ProjectsFolder),
    IMAGES: path.join(process.cwd(), PlatformStructure.DataFolder, PlatformStructure.ImagesFolder),

    TEMPLATE: (templateName: string) => path.join(process.cwd(), PlatformStructure.DataFolder, PlatformStructure.TemplatesFolder, templateName),

    PROVIDER: (providerId: string) => path.join(process.cwd(), PlatformStructure.DataFolder, PlatformStructure.ProvidersFolder, providerId),

    DEPLOYMENT: (deploymentId: string) => path.join(process.cwd(), PlatformStructure.DataFolder, PlatformStructure.DeploymentsFolder, deploymentId),

    PROJECT: (projectUUID: string) => path.join(process.cwd(), PlatformStructure.DataFolder, PlatformStructure.ProjectsFolder, projectUUID),
};

export interface ProviderManifest extends TerraformProvider {
    inputs: InputField[];
    outputs: {
        name: string;
        type: string;
        description: string;
    }[];
}

export interface TerraformOutputField {
    value: string;
    type: string;
    sensitive: boolean;
}

export interface TerraformOutput {
    [key: string]: TerraformOutputField; // Allows dynamic keys
}

export enum DeploymentQueueType {
    Plan = "plan",
    Apply = "apply",
    Refresh = "refresh",
    Destroy = "destroy"
}

export interface DeploymentQueue {
    type: DeploymentQueueType;
    deploymentId?: string; // only for plan and apply
    projectId: Project['uuid'];
    timestamp: Date;
}