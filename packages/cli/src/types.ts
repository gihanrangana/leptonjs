/**
 * LeptonJS Desktop — project config for the CLI.
 *
 * Used by real apps and by examples (same shape).
 * Declared in package.json under `"lepton"` or in `lepton.config.json`.
 */

import type { LeptonFileConfig } from './config-schema';

// export interface LeptonProjectConfig {
//     readonly frontend?: string;
//     readonly backend?: string;
//     readonly watch?: string[];
//     readonly port?: number;
//     readonly backendTsconfig?: string;
//     readonly backendOutDir?: string;
//     readonly assetDir?: string;
//     readonly releaseDir?: string;
//     readonly appName?: string;
//     readonly nodeVersion?: string;
//     readonly icon?: string;
// }
export type LeptonProjectConfig = Omit<LeptonFileConfig, '$schema'>;

export interface ResolvedLeptonProject {
    readonly appRoot: string;
    readonly frontendDir: string;
    readonly backendEntry: string;
    readonly watch: string[];
    readonly port: number;
    readonly backendTsconfig: string | null;
    readonly backendOutDir: string;
    readonly assetDir: string;
    readonly releaseDir: string;
    readonly appName: string;
    readonly iconPath: string;
    readonly splash?: LeptonProjectConfig['splash'];
    readonly config: Required<
        Pick<LeptonProjectConfig, 'frontend' | 'backend' | 'watch' | 'port'>
    > & {
        readonly backendTsconfig: string | null;
        readonly backendOutDir: string;
        readonly assetDir: string;
        readonly releaseDir: string;
        readonly appName: string;
        readonly nodeVersion?: string;
        readonly icon?: string;
        readonly splash?: LeptonProjectConfig['splash'];
    };
}
