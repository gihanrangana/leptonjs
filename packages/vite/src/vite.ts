import { type ChildProcess, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

import type { LeptonPluginOptions } from './types';

const forwardToTui = (stream: NodeJS.ReadableStream | null): void => {
    if (!stream || typeof process.send !== 'function') return;

    let buf = '';

    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => {
        buf += chunk;
        const parts = buf.split(/\r?\n/);
        buf = parts.pop() ?? '';

        for (const line of parts) process.send?.({ type: 'log', source: 'backend', text: line });
    });

    stream.on('end', () => {
        if (buf.length > 0) process.send?.({ type: 'log', source: 'backend', text: buf });
    });
};

const resolveSetupModule = (rootDir: string, backendEntry: string, explicit?: string): string => {
    if (explicit) return resolve(explicit);

    return join(dirname(resolve(rootDir, backendEntry)), 'app.ts');
};

export const leptonjs = (options: LeptonPluginOptions): Plugin => {
    const MAX_CRASH_RESTARTS = 5;
    let backend: ChildProcess | null = null;
    let viteServer: ViteDevServer | null = null;
    let rootDir = process.cwd();
    let lastDevUrl = '';
    let stopping = false;
    let generation = 0;
    let crashRestarts = 0;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;

    const logBackend = (text: string): void => {
        if (process.env.LEPTON_TUI === '1') {
            process.send?.({ type: 'log', source: 'backend', text });
        } else {
            console.log(text);
        }
    };

    const stopBackend = (): void => {
        stopping = true;
        generation += 1;
        crashRestarts = 0;
        if (restartTimer) {
            clearTimeout(restartTimer);
            restartTimer = null;
        }
        if (backend) {
            backend.kill();
            backend = null;
        }
    };

    const startBackend = (devUrl: string): void => {
        if (stopping || backend) return;
        lastDevUrl = devUrl;
        const gen = generation;

        logBackend(`[lepton] starting backend: ${options.backendEntry}`);

        const req = createRequire(resolve(rootDir, 'package.json'));
        let tsxPkg: string;
        try {
            tsxPkg = req.resolve('tsx/package.json');
        } catch {
            tsxPkg = require.resolve('tsx/package.json');
        }
        const tsxBin = join(dirname(tsxPkg), 'dist', 'cli.mjs');

        backend = spawn(
            process.execPath,
            [
                tsxBin,
                '--tsconfig',
                resolve(rootDir, 'tsconfig.backend.json'),
                resolve(options.backendEntry),
            ],
            {
                stdio: process.env.LEPTON_TUI === '1' ? ['ignore', 'pipe', 'pipe'] : 'inherit',
                env: {
                    ...process.env,
                    ...options.env,
                    LEPTON_DEV: '1',
                    LEPTON_DEV_URL: devUrl,
                    LEPTON_DEV_ORIGIN: devUrl,
                    LEPTON_WATCH_DIRS: (options.watch ?? [])
                        .map((p) => resolve(rootDir, p))
                        .join(','),
                    LEPTON_SETUP_MODULE: resolveSetupModule(
                        rootDir,
                        options.backendEntry,
                        options.setupModule,
                    ),
                },
            },
        );

        if (process.env.LEPTON_TUI === '1') {
            forwardToTui(backend.stdout);
            forwardToTui(backend.stderr);
        }

        backend.on('exit', (code) => {
            backend = null;
            const exitCode = code ?? 0;

            if (stopping || gen !== generation) return;

            if (exitCode !== 0 && lastDevUrl) {
                crashRestarts += 1;
                if (crashRestarts > MAX_CRASH_RESTARTS) {
                    logBackend(`[lepton] backend crashed ${MAX_CRASH_RESTARTS} times; giving up`);
                    if (viteServer) {
                        viteServer
                            .close()
                            .catch(() => {})
                            .finally(() => process.exit(exitCode));
                    } else {
                        process.exit(exitCode);
                    }
                    return;
                }
                logBackend(`[lepton] backend exited with code ${exitCode}, restarting`);
                restartTimer = setTimeout(() => {
                    restartTimer = null;
                    if (stopping || gen !== generation) return;
                    startBackend(lastDevUrl);
                }, 300);
                return;
            }

            crashRestarts = 0;

            if (viteServer) {
                viteServer
                    .close()
                    .catch(() => {})
                    .finally(() => process.exit(exitCode));
            } else {
                process.exit(exitCode);
            }
        });
    };

    return {
        name: 'leptonjs/vite',
        config: () => ({
            server: {
                host: '127.0.0.1',
            },
            optimizeDeps: {
                include: ['@leptonjs/registry', '@leptonjs/client', '@leptonjs/react'],
            },
        }),
        configResolved: (config) => {
            const host = config.server.host;
            if (host !== '127.0.0.1' && host !== 'localhost') {
                config.logger.warn(
                    '[leptonjs] server.host must be 127.0.0.1 for WebView CORS; overriding.',
                );
                config.server.host = '127.0.0.1';
            }
        },
        configureServer: (server: ViteDevServer) => {
            rootDir = server.config.root;
            viteServer = server;

            const httpServer = server.httpServer;
            if (!httpServer) {
                server.config.logger.warn(
                    '[leptonjs] Vite is in middleware mode; the backend will not start.',
                );
                return;
            }

            const start = (): void => {
                const addr = httpServer.address();
                const port = typeof addr === 'object' && addr ? addr.port : 5173;
                startBackend(`http://127.0.0.1:${port}`);
            };

            httpServer.on('listening', start);
            httpServer.on('close', stopBackend);
            process.on('exit', stopBackend);
        },
    };
};
