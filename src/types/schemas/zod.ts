import { z, ZodSchema } from "zod";
import { DeploymentStatus, DeploymentType, InputTypes, OutputTypes } from "../PlatformStructure";

export function validateWithSchema<T>(schema: ZodSchema<T>, data: unknown): T {
    try {
        return schema.parse(data);
    } catch (error: any) {
        console.error("Validation failed:", error.errors);
        throw new Error("Validation error");
    }
}

export const deploymentStatusSchema = z.nativeEnum(DeploymentStatus);

export const StringNumberBooleanSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);

export const inputTypesSchema = z.nativeEnum(InputTypes);

export const outputTypesSchema = z.nativeEnum(OutputTypes);

export const deploymentTypeSchema = z.nativeEnum(DeploymentType);

export const inputFieldSchema = z.object({
    name: z.string(),
    title: z.string().optional(),
    type: inputTypesSchema,
    required: z.boolean(),
    description: z.string(),
    secret: z.boolean().optional(),
    providerType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    resourceTypes: z.array(z.string()).optional(),
    quota: z.boolean().optional(),
    default: z.union([z.string(), z.number(), z.boolean()]).optional(), // Added `boolean`
});

export const outputFieldSchema = z.object({
    name: z.string(),
    type: outputTypesSchema,
    sensitive: z.boolean(),
});

export const providerConfigurationSchema = z.record(
    z.object({
        type: inputTypesSchema,
        value: z.any(),
        configuration: z.boolean().optional(),
        secret: z.boolean().optional(),
        providerId: z.string().optional(),
    }),
);

export const providerConfigurationChangeSchema = z.record(
    z.object({
        value: z.any(),
    }),
);

export const providerTerraformSchema = z.object({
    source: z.string(),
    version: z.string(),
});

export const providerTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    resourceProvider: z.boolean().optional(),
    terraform: providerTerraformSchema,
    inputs: z.array(inputFieldSchema),
});

export const OutputConfigurationSchema = z.record(
    z.object({
        fromOutput: z.string()
    })
);

export const ResourceConfigurationSchema = z.object({
    name: z.object({
        from: z.string()
    }),
    config: OutputConfigurationSchema.optional(),
    provider: z.object({
        providerId: z.string(),
        config: z.record(z.string(), z.object({
            from: z.string()
        }))
    }).optional()
});

export const UniqueConstraintConfigurationSchema = z.record(
    z.object({
        from: z.string(),
        value: z.string().optional(),
        scope: z.string().optional(),      // replace z.string() with actual enum if you have one
        scopeFrom: z.string().optional(),
    })
);

export const ResourceUsageConfigurationSchema = z.record(
    z.object({
        from: z.string(),
        value: z.string().optional(),
    })
);

export const deploymentTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: deploymentTypeSchema,
    description: z.string(),
    category: z.string(),
    subcategory: z.string(),
    providers: z.array(z.string()).optional(),
    inputs: z.array(inputFieldSchema),
    outputs: z.array(outputFieldSchema).optional(),
    resources: z.array(ResourceConfigurationSchema).optional(),
    // uniqueConstraints: z.array(UniqueConstraintConfigurationSchema).optional(),
    resourceUsages: z.array(ResourceUsageConfigurationSchema).optional(),
    imageKey: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
});

export const deploymentConfigurationSchema = z.record(
    z.object({
        type: inputTypesSchema,
        value: z.any(),
        secret: z.boolean().optional(),
    }),
);

export const TerraformOutputFieldSchema = z.object({
    sensitive: z.boolean(), // Ensures 'sensitive' is a boolean
    type: z.union([z.literal("string"), z.literal("number"), z.literal("boolean")]), // Ensures valid types
    value: z.any(), // Can be string, number, or boolean
});

export const ProjectResourceQuotaTypeSchema = z.object({
    cpu: z.number(),
    memory: z.number(),
    storage: z.number(),
}).catchall(z.number());

export const ResourceQuotaUsageTypeSchema = z.object({
    cpu: z.number(),
    memory: z.number(),
    storage: z.number(),
}).catchall(z.number());