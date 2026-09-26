import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const cliPackageRoot = (): string => {
    const fromDist = join(here, '..', 'package.json');
    if (existsSync(fromDist) && /[/\\]dist$/i.test(here)) {
        return dirname(fromDist);
    }

    const fromSrc = join(here, '..', '..', 'package.json');
    if (existsSync(fromSrc)) return dirname(fromSrc);

    throw new Error(`Cannot resolve @leptonjs/cli package root from ${here}`);
};

/** Preferred: shipped with @leptonjs/cli. Fallback: monorepo cargo output. */
export const hostExeCandidates = (): string[] => {
    const root = cliPackageRoot();
    return [
        join(root, 'host', 'lepton-host.exe'),
        join(root, 'host', 'bin', 'lepton-host.exe'),
        join(root, '..', '..', 'host', 'target', 'release', 'lepton-host.exe'),
    ];
};

export const hostExePath = (): string => {
    const candidates = hostExeCandidates();
    return candidates.find((path) => existsSync(path)) ?? candidates[0];
};

export const innoTemplatePath = (): string => join(cliPackageRoot(), 'installer', 'template.iss');

export const cliPackageJsonPath = (): string => join(cliPackageRoot(), 'package.json');
