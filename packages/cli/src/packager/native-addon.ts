import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { PackConfig } from './types';
import { hashFile, platformTriple } from './utils';

export const copyNativeAddons = async (config: PackConfig): Promise<void> => {
    const requireFromApp = createRequire(join(config.appRoot, 'package.json'));
    const triple = platformTriple(config.platform, config.arch as NodeJS.Architecture);
    const platformPkg = `@leptonjs/native-${triple}`;

    const candidates: string[] = [];
    try {
        candidates.push(requireFromApp.resolve(platformPkg));
    } catch {
        /* optional platform package missing */
    }

    try {
        const coreMain = requireFromApp.resolve('@leptonjs/core');
        const coreRoot = join(dirname(coreMain), '..');
        candidates.push(
            join(coreRoot, '..', `native-${triple}`, `leptonjs-desktop-native.${triple}.node`),
        );
    } catch {
        /* core not installed */
    }

    try {
        const legacyMain = requireFromApp.resolve('leptonjs-desktop');
        const pkgRoot = join(dirname(legacyMain), '..');
        candidates.push(
            join(pkgRoot, 'dist', 'nodes', `leptonjs-desktop-native.${triple}.node`),
            join(pkgRoot, 'dist', 'nodes', 'leptonjs-desktop-native.node'),
        );
    } catch {
        /* legacy package name unused */
    }

    const source = candidates.find((file) => existsSync(file));
    if (!source)
        throw new Error(`Native addon not found (tried ${platformPkg}). Run pnpm build:native.`);

    const destDir = join(config.releaseDir, 'runtime');
    mkdirSync(destDir, { recursive: true });

    const dest = join(destDir, source.split(/[/\\]/).pop() as string);

    const sourceHash = await hashFile(source);
    copyFileSync(source, dest);

    const destHash = await hashFile(dest);
    if (sourceHash !== destHash) throw new Error(`Native addon copy hash mismatch for ${dest}`);
};
