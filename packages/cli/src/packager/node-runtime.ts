import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { nodeDistPlatform, parseSha256 } from '../helpers';
import type { PackConfig } from './types';
import { downloadFile, emptyDir, hashFile, nodeBinaryName, spawnAsync } from './utils';

const CACHE_DIR = join(homedir(), '.leptonjs', 'cache');

export const downloadNodeRuntime = async (config: PackConfig): Promise<void> => {
    const distPlatform = nodeDistPlatform(config.platform, config.arch as NodeJS.Architecture);
    const distName = `node-v${config.nodeVersion}-${distPlatform}`;
    const archiveExt = config.platform === 'win32' ? 'zip' : 'tar.gz';
    const archiveName = `${distName}.${archiveExt}`;
    const binaryName = nodeBinaryName(config.platform);
    const cachePath = join(CACHE_DIR, distName, binaryName);

    if (!existsSync(cachePath)) {
        const versionUrl = `https://nodejs.org/dist/v${config.nodeVersion}`;
        const archivePath = join(CACHE_DIR, 'downloads', archiveName);
        const sumsPath = join(CACHE_DIR, 'downloads', `SHASUMS256-${config.nodeVersion}.txt`);

        await downloadFile(`${versionUrl}/${archiveName}`, archivePath);
        await downloadFile(`${versionUrl}/SHASUMS256.txt`, sumsPath);

        const expected = parseSha256(readFileSync(sumsPath, 'utf-8'), archiveName);
        const actual = await hashFile(archivePath);
        if (actual !== expected) {
            throw new Error(
                `Node.js archive hash mismatch for ${archiveName}\nexpected ${expected}\nactual   ${actual}`,
            );
        }

        const extractDir = join(CACHE_DIR, 'extract', distName);
        emptyDir(extractDir);

        const tarArgs =
            config.platform === 'win32'
                ? ['-xf', archivePath, '-C', extractDir]
                : ['-xzf', archivePath, '-C', extractDir];

        const extracted = await spawnAsync('tar', tarArgs);
        if (extracted.code !== 0) {
            throw new Error(`Failed to extract ${archiveName}: ${extracted.stderr}`);
        }

        const extractedBinary = join(extractDir, distName, binaryName);
        if (!existsSync(extractedBinary)) {
            throw new Error(`Extracted Node binary not found: ${extractedBinary}`);
        }

        mkdirSync(dirname(cachePath), { recursive: true });
        copyFileSync(extractedBinary, cachePath);
        if (config.platform !== 'win32') chmodSync(cachePath, 0o755);

        rmSync(extractDir, { recursive: true, force: true });
    }

    const runtimeDir = join(config.releaseDir, 'runtime');
    mkdirSync(runtimeDir, { recursive: true });
    copyFileSync(cachePath, join(runtimeDir, binaryName));
    if (config.platform !== 'win32') chmodSync(join(runtimeDir, binaryName), 0o755);
};
