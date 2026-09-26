import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
    createReadStream,
    createWriteStream,
    existsSync,
    mkdirSync,
    readdirSync,
    renameSync,
    rmSync,
    statSync,
    unlinkSync,
} from 'node:fs';
import https from 'node:https';
import { dirname, join } from 'node:path';

export const platformTriple = (
    platform = process.platform,
    arch: NodeJS.Architecture | undefined = process.arch,
): string => {
    switch (`${platform}-${arch}`) {
        case 'win32-x64':
            return 'win32-x64-msvc';
        case 'win32-arm64':
            return 'win32-arm64-msvc';
        case 'darwin-x64':
            return 'darwin-x64';
        case 'darwin-arm64':
            return 'darwin-arm64';
        case 'linux-x64':
            return 'linux-x64-gnu';
        case 'linux-arm64':
            return 'linux-arm64-gnu';
        default:
            throw new Error(`Unsupported platform: ${platform}-${arch}`);
    }
};

export const nodeBinaryName = (platform: NodeJS.Platform): string =>
    platform === 'win32' ? 'node.exe' : 'node';

export const brandedRuntimeName = (appName: string, platform: NodeJS.Platform): string =>
    platform === 'win32' ? `${appName}-runtime.exe` : `${appName}-runtime`;

export const emptyDir = (dir: string): void => {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
};

export const hashFile = (filePath: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const hash = createHash('sha256');
        const stream = createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });

export const spawnAsync = (
    cmd: string,
    args: string[],
    opts?: { cwd?: string; env?: NodeJS.ProcessEnv },
): Promise<{ code: number; stdout: string; stderr: string }> =>
    new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout?.on('data', (chunk: Buffer | string) => {
            stdout += chunk.toString();
        });
        child.stderr?.on('data', (chunk: Buffer | string) => {
            stderr += chunk.toString();
        });
        child.on('error', reject);
        child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    });

export const downloadFile = (url: string, dest: string): Promise<void> => {
    mkdirSync(dirname(dest), { recursive: true });
    const tmp = `${dest}.tmp`;

    const cleanup = (): void => {
        try {
            if (existsSync(tmp)) unlinkSync(tmp);
        } catch {
            /* ignore */
        }
    };

    const follow = (current: string, hops: number): Promise<void> =>
        new Promise((resolve, reject) => {
            if (hops > 5) {
                reject(new Error(`Too many redirects for ${url}`));
                return;
            }

            const req = https.get(current, (res) => {
                const status = res.statusCode ?? 0;
                if (status >= 300 && status < 400 && res.headers.location) {
                    const next = new URL(res.headers.location, current).href;
                    res.resume();
                    follow(next, hops + 1).then(resolve, reject);
                    return;
                }
                if (status !== 200) {
                    res.resume();
                    reject(new Error(`GET ${current} → ${status}`));
                    return;
                }

                const file = createWriteStream(tmp);
                const fail = (error: Error): void => {
                    res.destroy();
                    file.destroy();
                    cleanup();
                    reject(error);
                };

                res.on('error', fail);
                file.on('error', fail);
                file.on('finish', () => {
                    file.close((closeErr) => {
                        if (closeErr) {
                            cleanup();
                            reject(closeErr);
                            return;
                        }
                        try {
                            renameSync(tmp, dest);
                            resolve();
                        } catch (e) {
                            cleanup();
                            reject(e);
                        }
                    });
                });
                res.pipe(file);
            });

            req.setTimeout(60_000, () => {
                req.destroy(new Error(`GET ${current} timed out`));
            });
            req.on('error', (error) => {
                cleanup();
                reject(error);
            });
        });

    return follow(url, 0);
};

export const dirSize = (dir: string): number => {
    if (!existsSync(dir)) return 0;
    let total = 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) total += dirSize(p);
        else total += statSync(p).size;
    }
    return total;
};
