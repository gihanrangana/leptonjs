import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { NativeModule } from './types';

export type { NativeModule, NativeWindowOptions, WindowEvent, WindowEventListener } from './types';
export { WindowEventKind } from './types';

const requireFromHere = createRequire(__filename);

const PLATFORM_PACKAGES: Record<string, string> = {
    'win32-x64': '@leptonjs/native-win32-x64-msvc',
};

const platformTriple = (): string => {
    const { platform, arch } = process;
    switch (`${platform}-${arch}`) {
        case 'win32-x64':
            return 'win32-x64-msvc';
        case 'win32-arm64':
            return 'win32-arm64-msvc';
        case 'darwin-x64':
            return 'darwin-x64';
        case 'darwin-arm64':
            return 'darwin-arm64';
        case 'linux-x64':
            return 'linux-x64-gnu';
        case 'linux-arm64':
            return 'linux-arm64-gnu';
        default:
            throw new Error(`Unsupported platform: ${platform}-${arch}`);
    }
};

const fromPlatformPackage = (): string | undefined => {
    const specifier = PLATFORM_PACKAGES[`${process.platform}-${process.arch}`];
    if (!specifier) return undefined;
    try {
        return requireFromHere.resolve(specifier);
    } catch {
        return undefined;
    }
};

const candidatePaths = (): string[] => {
    let triple: string | undefined;
    try {
        triple = platformTriple();
    } catch {
        triple = undefined;
    }
    const nativeDir = process.env.LEPTON_NATIVE_DIR;
    const fromPkg = fromPlatformPackage();
    const here = __dirname;
    const repoRoot = join(here, '..', '..', '..');
    const inWorkspace =
        existsSync(join(repoRoot, 'pnpm-workspace.yaml')) &&
        existsSync(join(repoRoot, 'native', 'Cargo.toml'));

    const paths: string[] = [];
    if (nativeDir) {
        if (triple) paths.push(join(nativeDir, `leptonjs-desktop-native.${triple}.node`));
        paths.push(join(nativeDir, 'leptonjs-desktop-native.node'));
    }
    if (fromPkg) paths.push(fromPkg);
    if (inWorkspace && triple) {
        const monorepoNodes = join(repoRoot, 'dist', 'nodes');
        paths.push(
            join(monorepoNodes, `leptonjs-desktop-native.${triple}.node`),
            join(monorepoNodes, 'leptonjs-desktop-native.node'),
        );
    }
    return paths;
};

const loadNative = (): NativeModule => {
    const looked = candidatePaths();
    for (const candidate of looked) {
        if (existsSync(candidate)) return requireFromHere(candidate) as NativeModule;
    }

    const specifier = PLATFORM_PACKAGES[`${process.platform}-${process.arch}`];
    throw new Error(
        'Native addon not found. This beta supports Windows x64 only — install ' +
            `\`${specifier ?? '@leptonjs/native-win32-x64-msvc'}\`. ` +
            `Looked in: ${looked.join(', ') || '(no candidate paths)'}`,
    );
};

export const native: NativeModule = loadNative();
