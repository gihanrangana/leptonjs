#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');

/**
 * LeptonJS Desktop — dynamic example dispatcher.
 *
 * Usage: pnpm dev <example-name>
 *
 *   pnpm dev hello  → tsx examples/hello/index.ts
 *   pnpm dev react  → vite (inside examples/react; the plugin spawns the backend)
 */

const name = process.argv[2];

if (!name) {
    console.error('Usage: pnpm dev <example-name>');
    process.exit(1);
}

const dir = resolve('examples', name);
if (!existsSync(dir)) {
    console.error(`Example not found: examples/${name}.`);
    process.exit(1);
}

const hasVite =
    existsSync(resolve(dir, 'vite.config.ts')) ||
    existsSync(resolve(dir, 'vite.config.js')) ||
    existsSync(resolve(dir, 'vite.config.mjs'));

let child;

if (hasVite) {
    const vitePkg = require.resolve('vite/package.json', { paths: [dir] });
    const viteBin = join(dirname(vitePkg), 'bin', 'vite.js');
    child = spawn(process.execPath, [viteBin], {
        cwd: dir,
        stdio: 'inherit',
    });
} else {
    let tsxPkg;
    try {
        tsxPkg = require.resolve('tsx/package.json', { paths: [dir] });
    } catch {
        tsxPkg = require.resolve('tsx/package.json');
    }
    const tsxBin = join(dirname(tsxPkg), 'dist', 'cli.mjs');
    child = spawn(process.execPath, [tsxBin, 'index.ts'], {
        cwd: dir,
        stdio: 'inherit',
    });
}

const cleanup = () => {
    child.kill();
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

child.on('exit', (code) => process.exit(code ?? 0));
