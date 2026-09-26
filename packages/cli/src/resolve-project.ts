/**
 * Resolve frontend/backend/watch/port for an app root.
 * Same logic for real projects and examples.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectConfig } from './load-config';
import type { ResolvedLeptonProject } from './types';

const VITE_CONFIGS = [
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mjs',
    'vite.config.mts',
] as const;

const BACKEND_CANDIDATES = ['src/backend/main.ts', 'src/main.ts', 'src/index.ts'] as const;
const DEFAULT_WATCH = ['src/backend', 'src/shared'] as const;
const DEFAULT_PORT = 5173;
const DEFAULT_BACKEND_TSCONFIG = 'tsconfig.backend.json';
const DEFAULT_BACKEND_OUT_DIR = 'dist-backend';
const DEFAULT_ASSET_DIR = 'dist';
const DEFAULT_RELEASE_DIR = 'release';
const DEFAULT_APP_NAME = 'LeptonApp';

const hasViteConfig = (dir: string): boolean =>
    VITE_CONFIGS.some((name) => existsSync(join(dir, name)));

const resolveFrontendDir = (appRoot: string, configured?: string): string => {
    if (configured) {
        const dir = resolve(appRoot, configured);

        if (!existsSync(dir)) throw new Error(`lepton.frontend not found: ${dir}`);

        if (!hasViteConfig(dir)) {
            throw new Error(`No vite.config.* in lepton.frontend: ${dir}`);
        }

        return dir;
    }

    if (hasViteConfig(appRoot)) return appRoot;

    const client = join(appRoot, 'client');

    if (existsSync(client) && hasViteConfig(client)) return client;

    throw new Error(
        `No Vite frontend found in ${appRoot}. ` +
            `Expected vite.config.* at the app root (React template), ` +
            `or set lepton.frontend.`,
    );
};

const resolveBackendEntry = (appRoot: string, configured?: string): string => {
    if (configured) {
        const file = resolve(appRoot, configured);
        if (!existsSync(file)) throw new Error(`lepton.backend not found: ${file}`);
        return file;
    }

    for (const rel of BACKEND_CANDIDATES) {
        const file = resolve(appRoot, rel);
        if (existsSync(file)) return file;
    }

    throw new Error(
        `No backend entry found in ${appRoot}. ` +
            `Expected one of ${BACKEND_CANDIDATES.join(', ')} at the app root, ` +
            `or set lepton.backend.`,
    );
};

const resolveBackendOutDir = (appRoot: string, configured?: string): string => {
    if (configured) {
        return resolve(appRoot, configured);
    }
    return resolve(appRoot, DEFAULT_BACKEND_OUT_DIR);
};

const resolveAssetDir = (appRoot: string, frontendDir: string, configured?: string): string => {
    if (configured) {
        return resolve(appRoot, configured);
    }
    // Default: frontendDir/dist (where Vite builds to)
    return resolve(frontendDir, DEFAULT_ASSET_DIR);
};

const resolveWatch = (appRoot: string, configured?: string[]): string[] => {
    const rels = configured && configured.length > 0 ? configured : [...DEFAULT_WATCH];
    return rels.map((p) => resolve(appRoot, p));
};

const resolveBackendTsconfigStrict = (appRoot: string, configured?: string): string | null => {
    if (configured) {
        const file = resolve(appRoot, configured);

        if (!existsSync(file)) {
            throw new Error(`lepton.backendTsconfig not found: ${file}`);
        }
        return file;
    }

    const file = join(appRoot, DEFAULT_BACKEND_TSCONFIG);
    return existsSync(file) ? file : null;
};

const resolveReleaseDir = (appRoot: string, configured?: string): string => {
    return resolve(appRoot, configured ?? DEFAULT_RELEASE_DIR);
};

const sanitizeAppName = (name: string): string => {
    const cleaned = name.replace(/[<>:"/\\|?*]/g, '-').trim();
    return cleaned.length > 0 ? cleaned : DEFAULT_APP_NAME;
};

const resolveAppName = (appRoot: string, configured?: string): string => {
    if (configured) return sanitizeAppName(configured);

    const pkgPath = join(appRoot, 'package.json');
    if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { name?: string };

        if (pkg.name) {
            const unscoped = pkg.name.replace(/^@[^/]+\//, '');
            const titled = unscoped.charAt(0).toUpperCase() + unscoped.slice(1);
            return sanitizeAppName(titled);
        }
    }

    return DEFAULT_APP_NAME;
};

const resolveIconPath = (appRoot: string, configured?: string): string => {
    if (configured) {
        const custom = resolve(appRoot, configured);
        if (!existsSync(custom))
            console.warn(`⚠️  Custom icon not found: ${custom} — using default LeptonJS icon`);
        else return custom;
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    return join(__dirname, '..', 'assets', 'leptonjs-icon.ico');
};

export const resolveProject = (appRoot: string): ResolvedLeptonProject => {
    const loaded = loadProjectConfig(appRoot);
    const frontendDir = resolveFrontendDir(appRoot, loaded.frontend);
    const backendEntry = resolveBackendEntry(appRoot, loaded.backend);
    const backendOutDir = resolveBackendOutDir(appRoot, loaded.backendOutDir);
    const assetDir = resolveAssetDir(appRoot, frontendDir, loaded.assetDir);
    const watch = resolveWatch(appRoot, loaded.watch);
    const backendTsconfig = resolveBackendTsconfigStrict(appRoot, loaded.backendTsconfig);
    const releaseDir = resolveReleaseDir(appRoot, loaded.releaseDir);
    const appName = resolveAppName(appRoot, loaded.appName);
    const iconPath = resolveIconPath(appRoot, loaded.icon);

    const port = loaded.port ?? DEFAULT_PORT;

    const relativeBackend =
        loaded.backend ??
        BACKEND_CANDIDATES.find((c) => join(appRoot, c) === backendEntry) ??
        'src/backend/main.ts';

    const relativeFrontend = loaded.frontend ?? (frontendDir === appRoot ? '.' : 'client');

    return {
        appRoot,
        frontendDir,
        backendEntry,
        backendOutDir,
        assetDir,
        watch,
        port,
        backendTsconfig,
        releaseDir,
        appName,
        iconPath,
        splash: loaded.splash,
        config: {
            frontend: relativeFrontend,
            backend: relativeBackend,
            watch: loaded.watch ?? [...DEFAULT_WATCH],
            port,
            backendTsconfig:
                loaded.backendTsconfig ?? (backendTsconfig ? DEFAULT_BACKEND_TSCONFIG : null),
            backendOutDir: loaded.backendOutDir ?? DEFAULT_BACKEND_OUT_DIR,
            assetDir: loaded.assetDir ?? DEFAULT_ASSET_DIR,
            releaseDir: loaded.releaseDir ?? DEFAULT_RELEASE_DIR,
            appName,
            ...(loaded.nodeVersion ? { nodeVersion: loaded.nodeVersion } : {}),
            ...(loaded.icon ? { icon: loaded.icon } : {}),
            ...(loaded.splash ? { splash: loaded.splash } : {}),
        },
    };
};
