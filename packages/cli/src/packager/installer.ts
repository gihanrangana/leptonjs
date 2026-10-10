import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeDistPlatform } from '../helpers';
import { ensureIscc } from './inno-compiler';
import { innoTemplatePath } from './paths';
import type { PackConfig, RuntimeManifest } from './types';
import { spawnAsync } from './utils';

const toIssPath = (path: string): string => path.replaceAll('\\', '/');

const fillTemplate = (template: string, vars: Record<string, string>): string => {
    let out = template;
    for (const [key, value] of Object.entries(vars)) {
        out = out.replaceAll(`{{${key}}}`, value);
    }
    const leftover = out.match(/\{\{[A-Z0-9_]+\}\}/g);
    if (leftover) {
        throw new Error(`Unreplaced installer placeholders: ${leftover.join(', ')}`);
    }
    return out;
};

export const installerBaseName = (config: PackConfig): string =>
    `${config.appName}-${config.version}-${nodeDistPlatform(config.platform, config.arch)}-setup`;

export const buildInstaller = async (config: PackConfig): Promise<string> => {
    if (config.platform !== 'win32') throw new Error(`Inno Setup installer is Windows-only.`);

    const manifestPath = join(config.releaseDir, 'runtime-manifest.json');
    if (!existsSync(manifestPath))
        throw new Error(`runtime-manifest.json missing in ${config.releaseDir}.`);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as RuntimeManifest;

    if (config.bundleRuntime) {
        const bundled = join(config.releaseDir, 'runtime', `${config.appName}-runtime.exe`);
        if (!existsSync(bundled)) throw new Error(`--bundle-runtime requires ${bundled}`);
    }

    if (!existsSync(innoTemplatePath()))
        throw new Error(`Inno template not found at ${innoTemplatePath()}.`);

    const sourceDir = toIssPath(config.releaseDir);
    const filled = fillTemplate(readFileSync(innoTemplatePath(), 'utf-8'), {
        APP_NAME: config.appName,
        APP_VERSION: config.version,
        SOURCE_DIR: sourceDir,
        OUTPUT_DIR: toIssPath(config.outputDir),
        NODE_VERSION: manifest.nodeVersion,
        NODE_MAJOR: String(manifest.nodeMajor),
        NODE_DIST: nodeDistPlatform(config.platform, config.arch),
        NODE_ARCHIVE_NAME: manifest.archiveName,
        NODE_ARCHIVE_URL: manifest.downloadUrl,
        NODE_SHA256: manifest.archiveSha256,
        BUNDLE_RUNTIME: config.bundleRuntime ? '1' : '0',
        ENABLE_BYTECODE: config.enableBytecode ? '1' : '0',
        APP_ICON: existsSync(config.iconPath) ? toIssPath(config.iconPath) : '',
        OUTPUT_BASE_FILENAME: installerBaseName(config),
    });

    const issPath = join(config.outputDir, '_installer.iss');
    writeFileSync(issPath, filled, 'utf-8');

    const iscc = await ensureIscc();
    const compiled = await spawnAsync(iscc, [issPath]);
    if (compiled.code !== 0)
        throw new Error(
            `ISCC failed (code ${compiled.code}):\n${compiled.stderr || compiled.stdout}`,
        );

    const setupExe = join(config.outputDir, `${installerBaseName(config)}.exe`);
    if (!existsSync(setupExe)) {
        throw new Error(`ISCC did not produce ${setupExe}`);
    }
    return setupExe;
};
