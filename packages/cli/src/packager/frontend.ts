import { existsSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { PackConfig } from './types';
import { spawnAsync } from './utils';

const require = createRequire(import.meta.url);

const walkFiles = (dir: string): string[] => {
    if (!existsSync(dir)) return [];

    const out: string[] = [];

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);

        if (entry.isDirectory()) out.push(...walkFiles(p));
        else out.push(p);
    }

    return out;
};

export const buildFrontend = async (
    config: PackConfig,
): Promise<{ fileCount: number; totalBytes: number }> => {
    const vitePkg = require.resolve('vite/package.json', {
        paths: [config.frontendDir],
    });

    const viteBin = join(dirname(vitePkg), 'bin', 'vite.js');
    const outDir = join(config.releaseDir, 'assets');

    const result = await spawnAsync(
        process.execPath,
        [viteBin, 'build', `--outDir=${outDir}`, '--emptyOutDir'],
        { cwd: config.frontendDir },
    );

    if (result.code !== 0)
        throw new Error(`vite exited with code ${result.code}\n${result.stderr || result.stdout}`);

    const indexHtml = join(outDir, 'index.html');

    if (!existsSync(indexHtml))
        throw new Error(`vite build did not produce index.html at ${indexHtml}`);

    const files = walkFiles(outDir);
    const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
    return {
        fileCount: files.length,
        totalBytes,
    };
};
