import { cpSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import * as esbuild from 'esbuild';
import type { PackConfig } from './types';
import { spawnAsync } from './utils';

const require = createRequire(import.meta.url);

export const buildBackend = async (config: PackConfig): Promise<void> => {
    const appDir = join(config.releaseDir, 'app');
    mkdirSync(appDir, { recursive: true });

    const outFile = join(appDir, 'main.js');
    const nodeMajor = config.nodeVersion.split('.')[0] ?? 22;

    await esbuild.build({
        entryPoints: [config.backendEntry],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: `node${nodeMajor}`,
        minify: true,
        treeShaking: true,
        outfile: outFile,
        tsconfig: config.backendTsconfig ?? undefined,
        packages: 'bundle',
        define: {
            'process.env.NODE_ENV': '"production"',
            'process.env.LEPTON_DEV_URL': 'undefined',
            'process.env.LEPTON_DEV_ORIGIN': 'undefined',
            'import.meta.url': 'import_meta_url',
        },
        banner: {
            js:
                '/* LeptonJS Packed Application */\n' +
                'var import_meta_url = require("url").pathToFileURL(__filename).href;',
        },
    });

    if (!existsSync(outFile)) throw new Error(`esbuild failed to produce ${outFile}`);
};

export const copyBytenodeRuntime = (config: PackConfig): void => {
    const pkg = require.resolve('bytenode/package.json');
    const src = dirname(pkg);
    const dest = join(config.releaseDir, 'app', 'node_modules', 'bytenode');
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
};

export const compileBytecode = async (config: PackConfig, nodeBinary: string): Promise<void> => {
    const appDir = join(config.releaseDir, 'app');
    const mainJs = join(appDir, 'main.js');
    const mainJsc = join(appDir, 'main.jsc');
    const compileScript = join(appDir, '_compile.cjs');

    if (!existsSync(mainJs)) throw new Error(`Cannot compile bytecode: ${mainJs} is missing`);

    writeFileSync(
        compileScript,
        `'use strict';
        const bytenode = require('bytenode');
        const path = require('path');
        bytenode.compileFile(
            path.join(__dirname, 'main.js'),
            path.join(__dirname, 'main.jsc')
        );`,
        'utf-8',
    );

    try {
        const result = await spawnAsync(nodeBinary, [compileScript], { cwd: appDir });

        if (result.code !== 0)
            throw new Error(
                `bytenode compile failed (code ${result.code}): ${result.stderr || result.stdout}`,
            );

        if (!existsSync(mainJsc)) throw new Error(`bytenode did not produce main.jsc`);

        unlinkSync(mainJs);
    } finally {
        if (existsSync(compileScript)) unlinkSync(compileScript);
    }
};
