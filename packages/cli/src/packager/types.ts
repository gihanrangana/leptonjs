/**
 * Types for the packager module for LeptonJS
 */

export interface PackFlags {
    readonly nodeVersion?: string;
    readonly noBytecode: boolean;
    readonly noNodeRuntime: boolean;
    readonly skipIntegrity: boolean;
    readonly noInstaller: boolean;
    readonly bundleRuntime: boolean;
}

export interface PackConfig {
    readonly appRoot: string;
    readonly appName: string;
    readonly version: string;
    readonly frontendDir: string;
    readonly backendEntry: string;
    readonly backendTsconfig: string | null;
    readonly assetDir: string;
    readonly releaseDir: string;
    readonly platform: NodeJS.Platform;
    readonly arch: NodeJS.Architecture;
    readonly nodeVersion: string;
    readonly enableBytecode: boolean;
    readonly enableNodeRuntime: boolean;
    readonly skipIntegrity: boolean;
    readonly enableInstaller: boolean;
    readonly iconPath: string;
    readonly bundleRuntime: boolean;
}

export interface StepResult {
    readonly name: string;
    readonly durationMs: number;
    readonly success: boolean;
    readonly error?: string;
    readonly details?: Record<string, unknown>;
}

export interface PackResult {
    readonly releaseDir: string;
    readonly steps: StepResult[];
    readonly totalDurationMs: number;
    readonly outputSizeBytes: number;
    readonly integrityPassed: boolean;
}

export interface IntegrityFileEntry {
    readonly sha256: string;
    readonly bytes: number;
}

export interface IntegrityReport {
    readonly generatedAt: string;
    readonly version: string;
    readonly platform: string;
    readonly nodeVersion: string;
    readonly bytecodeEnabled: boolean;
    readonly files: Record<string, IntegrityFileEntry>;
    readonly plaintextScan: {
        readonly passed: boolean;
        readonly jsFilesFound: string[];
        readonly tsFilesFound: string[];
    };
}

export interface RuntimeManifest {
    readonly nodeVersion: string;
    readonly nodeMajor: number;
    readonly platform: NodeJS.Platform | string;
    readonly archiveName: string;
    readonly downloadUrl: string;
    readonly shasumsUrl: string;
    readonly archiveSha256: string;
    readonly runtimeScope: 'app';
    readonly installPath: string;
}

export type GithubAsset = { name: string; browser_download_url: string };

export type GithubAssetList = {
    tag_name: string;
    draft?: boolean;
    prerelease?: boolean;
    assets: GithubAsset[];
};

export type GithubRelease = GithubAssetList;

export type InnoDownload = {
    version: string;
    url: string;
    fileName: string;
};

export type CrtSource = {
    dir: string;
    copyAllDlls: boolean;
};
