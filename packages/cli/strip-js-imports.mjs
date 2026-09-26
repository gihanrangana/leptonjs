import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'c:/ApixJS/nodejs-desktop-app-builder/cli/src';

const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full);
            continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        const src = readFileSync(full, 'utf8');
        const next = src.replace(/from (['"])(\.[^'"]+)\.js\1/g, 'from $1$2$1');
        if (next !== src) {
            writeFileSync(full, next);
            console.log(full);
        }
    }
};

walk(root);
