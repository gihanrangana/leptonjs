import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LEPTON_CACHE_DIR, OPTIONAL_DLLS, REQUIRED_DLLS } from '../constants';
import type { CrtSource, PackConfig } from './types';
import { spawnAsync } from './utils';

const redistArch = (arch: NodeJS.Architecture): 'x64' | 'arm64' | 'x86' => {
    switch (arch) {
        case 'arm64':
            return 'arm64';
        case 'ia32':
            return 'x86';
        default:
            return 'x64';
    }
};

const cacheDirFor = (arch: NodeJS.Architecture): string =>
    join(LEPTON_CACHE_DIR, 'msvc-crt', redistArch(arch));

const vswherePath = (): string | null => {
    const roots = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles].filter(
        (p): p is string => typeof p === 'string' && p.length > 0,
    );

    for (const root of roots) {
        const candidate = join(root, 'Microsoft Visual Studio', 'Installer', 'vswhere.exe');
        if (existsSync(candidate)) return candidate;
    }

    return null;
};

const hasRequiredDlls = (dir: string): boolean =>
    REQUIRED_DLLS.every((name) => existsSync(join(dir, name)));

const envRedistDir = (arch: NodeJS.Architecture): string | null => {
    const root = process.env.VCToolsRedistDir;
    if (!root) return null;

    const folder = redistArch(arch);
    const candidates = [
        join(root, folder, 'Microsoft.VC143.CRT'),
        join(root, folder, 'Microsoft.VC142.CRT'),
    ];
    return candidates.find((dir) => hasRequiredDlls(dir)) ?? null;
};

const vswhereRedistDir = async (arch: NodeJS.Architecture): Promise<string | null> => {
    const vswhere = vswherePath();
    if (!vswhere) return null;

    const folder = redistArch(arch);

    try {
        const query = await spawnAsync(vswhere, [
            '-latest',
            '-products',
            '*',
            '-find',
            `**\\VC\\Redist\\MSVC\\*\\${folder}\\Microsoft.VC14*\\vcruntime140.dll`,
        ]);

        const hit = query.stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.toLowerCase().endsWith('vcruntime140.dll') && existsSync(line));

        if (!hit) return null;

        const dir = dirname(hit);
        return hasRequiredDlls(dir) ? dir : null;
    } catch {
        return null;
    }
};

const systemCrtDir = (arch: NodeJS.Architecture): string => {
    const root = process.env.SystemRoot ?? 'C:\\Windows';
    if (arch === 'ia32') return join(root, 'SysWOW64');
    return join(root, 'System32');
};

const resolveCrtSource = async (arch: NodeJS.Architecture): Promise<CrtSource> => {
    const fromEnv = envRedistDir(arch);
    if (fromEnv) return { dir: fromEnv, copyAllDlls: true };

    const fromVs = await vswhereRedistDir(arch);
    if (fromVs) return { dir: fromVs, copyAllDlls: true };

    const fromSystem = systemCrtDir(arch);
    if (hasRequiredDlls(fromSystem)) return { dir: fromSystem, copyAllDlls: false };

    const fromCache = cacheDirFor(arch);
    if (hasRequiredDlls(fromCache)) return { dir: fromCache, copyAllDlls: true };

    throw new Error(
        'MSVC CRT DLLs not found (vcruntime140.dll, vcruntime140_1.dll, msvcp140.dll). ' +
            'Install Visual Studio Build Tools with the C++ workload ' +
            '(full VS IDE is not required), or set VCToolsRedistDir.',
    );
};

const dllsToCopy = (source: CrtSource): string[] => {
    if (!source.copyAllDlls) {
        return [
            ...REQUIRED_DLLS,
            ...OPTIONAL_DLLS.filter((name) => existsSync(join(source.dir, name))),
        ];
    }
    return readdirSync(source.dir).filter((name) => name.toLowerCase().endsWith('.dll'));
};

const copyDllSet = (files: string[], srcDir: string, destDir: string): void => {
    mkdirSync(destDir, { recursive: true });

    for (const name of files) {
        const src = join(srcDir, name);

        if (!existsSync(src)) {
            throw new Error(`Required CRT DLL missing: ${src}`);
        }

        copyFileSync(src, join(destDir, name));
    }
};

export const copyMsvcCrt = async (config: PackConfig): Promise<void> => {
    if (config.platform !== 'win32') return;

    const source = await resolveCrtSource(config.arch);
    const files = dllsToCopy(source);
    const destDir = join(config.releaseDir, 'runtime');

    copyDllSet(files, source.dir, destDir);

    const cacheDir = cacheDirFor(config.arch);

    if (source.dir !== cacheDir) {
        copyDllSet(files, source.dir, cacheDir);
    }
};
