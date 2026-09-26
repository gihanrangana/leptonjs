import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { nodeDistPlatform, parseSha256 } from '../helpers';
import type { PackConfig, RuntimeManifest } from './types';
import { brandedRuntimeName, downloadFile, nodeBinaryName } from './utils';

const CACHE_DIR = join(homedir(), '.leptonjs', 'cache');

export const nodeArchiveName = (
    version: string,
    platform: NodeJS.Platform,
    arch: NodeJS.Architecture,
): string => {
    const dist = nodeDistPlatform(platform, arch);
    const ext = platform === 'win32' ? 'zip' : 'tar.gz';
    return `node-v${version}-${dist}.${ext}`;
};

export const writeRuntimeManifest = async (config: PackConfig): Promise<RuntimeManifest> => {
    const archiveName = nodeArchiveName(config.nodeVersion, config.platform, config.arch);
    const versionUrl = `https://nodejs.org/dist/v${config.nodeVersion}`;
    const downloadUrl = `${versionUrl}/${archiveName}`;
    const shasumsUrl = `${versionUrl}/SHASUMS256.txt`;

    const sumsPath = join(CACHE_DIR, 'downloads', `SHASUMS256-${config.nodeVersion}.txt`);
    if (!existsSync(sumsPath)) {
        mkdirSync(join(CACHE_DIR, 'downloads'), { recursive: true });
        await downloadFile(shasumsUrl, sumsPath);
    }

    const archiveSha256 = parseSha256(readFileSync(sumsPath, 'utf-8'), archiveName);
    const nodeMajor = Number.parseInt(config.nodeVersion.split('.')[0] ?? '22', 10);

    const manifest: RuntimeManifest = {
        nodeVersion: config.nodeVersion,
        nodeMajor,
        platform: `${config.platform}-${config.arch}`,
        archiveName,
        downloadUrl,
        shasumsUrl,
        archiveSha256,
        runtimeScope: 'app',
        installPath: config.enableNodeRuntime
            ? `runtime/${brandedRuntimeName(config.appName, config.platform)}`
            : `runtime/${nodeBinaryName(config.platform)}`,
    };

    writeFileSync(
        join(config.releaseDir, 'runtime-manifest.json'),
        JSON.stringify(manifest, null, 4),
        'utf-8',
    );

    return manifest;
};
