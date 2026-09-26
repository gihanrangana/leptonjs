/**
 * Load optional Lepton project config from the app root.
 *
 * Sources (first wins):
 *   1. lepton.config.json
 *   2. package.json → "lepton"
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseConfig } from './helpers';
import type { LeptonProjectConfig } from './types';

export const loadProjectConfig = (appRoot: string): LeptonProjectConfig => {
    const jsonConfig = join(appRoot, 'lepton.config.json');

    if (existsSync(jsonConfig)) {
        let raw: unknown;
        try {
            raw = JSON.parse(readFileSync(jsonConfig, 'utf-8'));
        } catch (e) {
            throw new Error(`Invalid JSON in ${jsonConfig}: ${(e as Error).message}`);
        }

        return parseConfig(raw, jsonConfig);
    }

    const pkgPath = join(appRoot, 'package.json');

    if (existsSync(pkgPath)) {
        let pkg: { lepton?: unknown };

        try {
            pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { lepton?: unknown };
        } catch (e) {
            throw new Error(`Invalid package.json in ${appRoot}: ${(e as Error).message}`);
        }

        if (pkg.lepton !== undefined) return parseConfig(pkg.lepton, `${pkgPath}#lepton`);
    }

    return {};
};
