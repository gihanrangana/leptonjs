import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export type SetupModule = {
    setup: (ipc: unknown) => (() => void) | undefined;
};

export const esmImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
) => Promise<SetupModule>;

const fold = (p: string): string => {
    const n = p.replaceAll('\\', '/').replace(/\/+$/, '');
    return process.platform === 'win32' ? n.toLowerCase() : n;
};

const inWatchDirs = (file: string, watchDirs: string[]): boolean => {
    const norm = fold(file);
    return watchDirs.some((dir) => {
        const prefix = fold(dir);
        return prefix.length > 0 && (norm === prefix || norm.startsWith(`${prefix}/`));
    });
};

/**
 * Load `setupModule` and bust tsx/CJS cache for files under `watchDirs`.
 * ESM `import(app.ts?t=…)` does not reload static children (greeting.ts, etc.).
 */
export const importSetupFresh = async (
    setupModule: string,
    watchDirs: string[],
): Promise<SetupModule> => {
    const fromApp = createRequire(setupModule);

    type TsxRequire = {
        (id: string, fromFile: string | URL): SetupModule;
        cache: NodeJS.Dict<NodeJS.Module>;
    };

    let tsxRequire: TsxRequire | null = null;
    try {
        const api = fromApp('tsx/cjs/api') as { require: TsxRequire };
        tsxRequire = api.require;
    } catch {
        tsxRequire = null;
    }

    if (!tsxRequire) {
        const href = `${pathToFileURL(setupModule).href}?t=${Date.now()}`;
        return esmImport(href);
    }

    for (const cache of [tsxRequire.cache, fromApp.cache]) {
        for (const key of Object.keys(cache)) {
            if (inWatchDirs(key, watchDirs)) delete cache[key];
        }
    }

    return tsxRequire(setupModule, setupModule) as SetupModule;
};

export const parseHexColorToRgba = (
    hexColor: string,
): [number, number, number, number] | undefined => {
    const hex = hexColor.trim();
    const m3 = /^#([0-9a-fA-F]{3})$/.exec(hex);

    if (m3) {
        const [r, g, b] = m3[1].split('').map((c) => parseInt(c + c, 16));
        return [r, g, b, 255];
    }

    const m6 = /^#([0-9a-fA-F]{6})$/.exec(hex);

    if (m6) {
        const n = m6[1];
        return [
            parseInt(n.slice(0, 2), 16),
            parseInt(n.slice(2, 4), 16),
            parseInt(n.slice(4, 6), 16),
            255,
        ];
    }

    const m8 = /^#([0-9a-fA-F]{8})$/.exec(hex);

    if (m8) {
        const n = m8[1];
        return [
            parseInt(n.slice(0, 2), 16),
            parseInt(n.slice(2, 4), 16),
            parseInt(n.slice(4, 6), 16),
            parseInt(n.slice(6, 8), 16),
        ];
    }

    return undefined;
};
