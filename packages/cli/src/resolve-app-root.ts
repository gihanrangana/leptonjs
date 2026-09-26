/**
 * Resolve which directory is the Lepton app root.
 *
 * Works for:
 *   - Real projects: `leptonjs dev` (cwd)
 *   - Framework examples: `leptonjs dev react` (examples/react)
 *   - Explicit paths: `leptonjs dev ./examples/react` or `leptonjs dev ../my-app`
 */

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

const looksLikePath = (target: string): boolean =>
    target.includes('/') || target.includes('\\') || target.startsWith('.') || isAbsolute(target);

const isFrameworkRepo = (cwd: string): boolean => {
    if (!existsSync(join(cwd, 'examples')) || !existsSync(join(cwd, 'native'))) return false;

    const pkgPath = join(cwd, 'package.json');
    if (!existsSync(pkgPath)) return false;

    try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
            name?: string;
        };
        return pkg.name === 'leptonjs-desktop';
    } catch {
        return false;
    }
};

export const resolveAppRoot = (target?: string, cwd: string = process.cwd()): string => {
    if (target && looksLikePath(target)) {
        const appRoot = resolve(cwd, target);
        if (!existsSync(appRoot)) {
            throw new Error(`App path not found: ${appRoot}`);
        }

        return appRoot;
    }

    if (target && isFrameworkRepo(cwd)) {
        const example = join(cwd, 'examples', target);
        if (existsSync(example)) return example;

        throw new Error(`Unknown example "${target}". Expected a folder at examples/${target}`);
    }

    if (target) {
        throw new Error(
            `Unknown target "${target}".\n` +
                `  Real project:  leptonjs dev\n` +
                `  Example:       leptonjs dev <name>   (from leptonjs-desktop repo)\n` +
                `  Explicit path: leptonjs dev ./path/to/app`,
        );
    }

    return cwd;
};
