import { copyFileSync, existsSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { rcedit } from 'rcedit';
import { hostExeCandidates, hostExePath } from './paths';
import type { PackConfig } from './types';
import { nodeBinaryName } from './utils';

const launcherSource = (bytecode: boolean): string => {
    const body = bytecode
        ? `require('bytenode');\nrequire(path.join(__dirname, 'main.jsc'));\n`
        : `require(path.join(__dirname, 'main.js'));\n`;

    return (
        `'use strict';\n` +
        `const path = require('path');\n` +
        `process.env.LEPTON_NATIVE_DIR = path.join(__dirname, '..', 'runtime');\n` +
        `process.env.LEPTON_ASSET_DIR = path.join(__dirname, '..', 'assets');\n` +
        // Set AUMID on the Node process so Task Manager groups windows with the host
        `if (process.env.LEPTON_APP_ID) {\n` +
        `  try {\n` +
        `    const fs = require('fs');\n` +
        `    const nativeDir = process.env.LEPTON_NATIVE_DIR;\n` +
        `    const addon = fs.readdirSync(nativeDir).find(f => f.endsWith('.node'));\n` +
        `    if (addon) require(path.join(nativeDir, addon)).setAppUserModelId(process.env.LEPTON_APP_ID);\n` +
        `  } catch {}\n` +
        `}\n` +
        body
    );
};

export const generateLauncher = async (config: PackConfig): Promise<void> => {
    const launcherPath = join(config.releaseDir, 'app', 'launcher.cjs');
    writeFileSync(launcherPath, launcherSource(config.enableBytecode), 'utf-8');

    if (config.platform !== 'win32') {
        const scriptPath = join(config.releaseDir, config.appName);
        const runtimeBin = config.enableNodeRuntime
            ? `./runtime/${nodeBinaryName(config.platform)}`
            : 'node';
        writeFileSync(
            scriptPath,
            `#!/bin/sh\nDIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)\nexec "${runtimeBin}" "$DIR/app/launcher.cjs" "$@"\n`,
            'utf-8',
        );
        return;
    }

    if (config.enableNodeRuntime) {
        const runtimeNode = join(config.releaseDir, 'runtime', 'node.exe');
        if (!existsSync(runtimeNode))
            throw new Error(`Bundled Node binary missing: ${runtimeNode}`);
    }

    const hostStub = hostExePath();
    if (!existsSync(hostStub)) {
        const looked = hostExeCandidates()
            .map((path) => `  ${path}`)
            .join('\n');
        throw new Error(
            `Host stub missing. Looked in:\n${looked}\n` +
                'Place lepton-host.exe at packages/cli/host/bin/, or run pnpm build:host ' +
                '(cargo build --release --manifest-path host/Cargo.toml).',
        );
    }

    const exePath = join(config.releaseDir, 'runtime', `${config.appName}.exe`);
    copyFileSync(hostStub, exePath);

    if (config.enableNodeRuntime) {
        const nodeExe = join(config.releaseDir, 'runtime', 'node.exe');
        const brandedNode = join(config.releaseDir, 'runtime', `${config.appName}-runtime.exe`);

        if (existsSync(nodeExe)) {
            renameSync(nodeExe, brandedNode);

            // Stamp Node runtime binary so Task Manager groups it under the app name & icon
            await rcedit(brandedNode, {
                'version-string': {
                    ProductName: config.appName,
                    FileDescription: config.appName,
                    OriginalFilename: `${config.appName}-runtime.exe`,
                },
                'file-version': config.version,
                'product-version': config.version,
                ...(config.iconPath && existsSync(config.iconPath)
                    ? { icon: config.iconPath }
                    : {}),
            });
        }
    }

    await rcedit(exePath, {
        'version-string': {
            ProductName: config.appName,
            FileDescription: config.appName,
            OriginalFilename: `${config.appName}.exe`,
        },
        'file-version': config.version,
        'product-version': config.version,
        ...(config.iconPath && existsSync(config.iconPath) ? { icon: config.iconPath } : {}),
    });
};
