import { z } from 'zod';

export const leptonSplashSchema = z
    .object({
        image: z.string().min(1),
        backgroundColor: z.string().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        minDurationMs: z.number().int().nonnegative().optional(),
    })
    .strict();

export const leptonConfigSchema = z
    .object({
        $schema: z.string().optional(),
        frontend: z.string().min(1).optional(),
        backend: z.string().min(1).optional(),
        watch: z.array(z.string().min(1)).optional(),
        port: z.number().int().min(1).max(65535).optional(),
        backendTsconfig: z.string().min(1).optional(),
        backendOutDir: z.string().min(1).optional(),
        assetDir: z.string().min(1).optional(),
        releaseDir: z.string().min(1).optional(),
        appName: z.string().min(1).optional(),
        nodeVersion: z.string().min(1).optional(),
        icon: z.string().min(1).optional(),
        splash: leptonSplashSchema.optional(),
    })
    .strict();

export type LeptonFileConfig = z.infer<typeof leptonConfigSchema>;
