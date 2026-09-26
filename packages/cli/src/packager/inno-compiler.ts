import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
    GITHUB_HEADERS,
    INNO_CACHE_ROOT,
    INNO_MAJOR,
    INNO_SETUP_RELEASES,
    INNO_SETUP_URL,
} from '../constants';
import type { GithubRelease, InnoDownload } from './types';
import { spawnAsync } from './utils';

// const here = dirname(fileURLToPath(import.meta.url));
// const INNO_TEMPLATE_PATH = join(here, '../../installer/template.iss');

const innoArchSuffix = (): 'x64' | 'x86' => (process.arch === 'ia32' ? 'x86' : 'x64');

const parseSemver = (version: string): [number, number, number] | null => {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const compareSemver = (a: string, b: string): number => {
    const pa = parseSemver(a);
    const pb = parseSemver(b);

    if (pa === null || pb === null) return 0;

    const [aMajor, aMinor, aPatch] = pa;
    const [bMajor, bMinor, bPatch] = pb;

    return aMajor - bMajor || aMinor - bMinor || aPatch - bPatch;
};

const fetchJson = async <T>(url: string): Promise<T> => {
    const res = await fetch(url, { headers: GITHUB_HEADERS });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);

    return (await res.json()) as T;
};

const downloadBinary = async (url: string, dest: string): Promise<void> => {
    mkdirSync(dirname(dest), { recursive: true });

    const res = await fetch(url, {
        headers: {
            'User-Agent': GITHUB_HEADERS['User-Agent'],
        },
        redirect: 'follow',
    });

    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);

    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
};

const pickInnoAsset = (release: GithubRelease): InnoDownload | null => {
    const suffix = innoArchSuffix();
    const asset = release.assets.find(
        (item) =>
            /^innosetup-\d+\.\d+\.\d+-(x64|x86)\.exe$/i.test(item.name) &&
            item.name.toLowerCase().endsWith(`-${suffix}.exe`),
    );

    if (!asset) return null;

    const version = asset.name.match(/innosetup-(\d+\.\d+\.\d+)/i)?.[1];
    if (!version) return null;

    const parsed = parseSemver(version);
    if (!parsed || parsed[0] !== INNO_MAJOR) return null;

    return {
        version,
        url: asset.browser_download_url,
        fileName: asset.name,
    };
};

const resolveInnoSetup = async (): Promise<InnoDownload> => {
    const latest = await fetchJson<GithubRelease>(INNO_SETUP_URL);
    const fromLatest = !latest.draft && !latest.prerelease ? pickInnoAsset(latest) : null;
    if (fromLatest) return fromLatest;

    const releases = await fetchJson<GithubRelease[]>(INNO_SETUP_RELEASES);
    for (const release of releases) {
        if (release.draft || release.prerelease) continue;

        const match = pickInnoAsset(release);
        if (match) return match;
    }

    throw new Error(
        `No Inno Setup ${INNO_MAJOR}.x installer on GitHub. See https://github.com/jrsoftware/issrc/releases`,
    );
};

const findCachedInno = (): string | null => {
    if (!existsSync(INNO_CACHE_ROOT)) return null;

    const versions = readdirSync(INNO_CACHE_ROOT, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => {
            const parsed = parseSemver(name);
            return parsed !== null && parsed[0] === INNO_MAJOR;
        })
        .filter((name) => existsSync(join(INNO_CACHE_ROOT, name, 'ISCC.exe')))
        .sort(compareSemver);

    const newest = versions.at(-1);
    return newest ? join(INNO_CACHE_ROOT, newest, 'ISCC.exe') : null;
};

const extractPortableInno = async (setupExe: string, cacheDir: string): Promise<string> => {
    const extracted = await spawnAsync(setupExe, [
        '/portable=1',
        '/VERYSILENT',
        '/CURRENTUSER',
        '/NORESTART',
        `/DIR=${cacheDir}`,
    ]);
    if (extracted.code !== 0)
        throw new Error(
            `Portable Inno Setup extract failed (code ${extracted.code}):\n${extracted.stderr || extracted.stdout}`,
        );

    const iscc = join(cacheDir, 'ISCC.exe');
    if (!existsSync(iscc)) throw new Error(`ISCC.exe not found after portable extract: ${iscc}`);
    return iscc;
};

const acquireFromGithub = async (release: InnoDownload): Promise<string> => {
    const cacheDir = join(INNO_CACHE_ROOT, release.version);
    const cached = join(cacheDir, 'ISCC.exe');
    if (existsSync(cached)) return cached;

    mkdirSync(cacheDir, { recursive: true });
    const setupExe = join(cacheDir, release.fileName);
    if (!existsSync(setupExe)) await downloadBinary(release.url, setupExe);

    return extractPortableInno(setupExe, cacheDir);
};

export const ensureIscc = async (): Promise<string> => {
    const envPath = process.env.INNO_SETUP_ISCC;
    if (envPath && existsSync(envPath)) return envPath;

    let githubError: unknown;
    try {
        const latest = await resolveInnoSetup();
        return await acquireFromGithub(latest);
    } catch (err) {
        githubError = err;
    }

    const cached = findCachedInno();
    if (cached) return cached;

    const detail = githubError instanceof Error ? githubError.message : String(githubError);
    throw new Error(
        `Could not acquire Inno Setup ${INNO_MAJOR}. Set INNO_SETUP_ISCC to ISCC.exe, or check GitHub: ${detail}`,
    );
};
