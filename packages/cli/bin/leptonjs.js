#!/usr/bin/env node
/**
 * LeptonJS CLI entry.
 * Runs compiled dist/index.js (see `pnpm --filter @leptonjs/cli build`).
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'index.js');

if (!existsSync(dist)) {
    console.error(
        'LeptonJS CLI is not built.\n' +
            '  pnpm --filter @leptonjs/cli build\n' +
            'For local TypeScript: pnpm --filter @leptonjs/cli dev',
    );
    process.exit(1);
}

await import(pathToFileURL(dist).href);
