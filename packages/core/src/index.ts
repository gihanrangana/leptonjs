/**
 * LeptonJS Desktop — public API surface.
 *
 * This is the entry point consumers import:
 *
 * ```ts
 * import { app, WindowEventKind } from 'leptonjs-desktop';
 *
 * app.createWindow({
 *   url: 'https://example.com',
 *   title: 'Hello',
 *   onEvent(event) {
 *     if (event.kind === WindowEventKind.Closed) console.log('window closed');
 *   },
 * });
 * ```
 *
 * Phase 2: window creation is asynchronous. `createWindow` returns immediately
 * and the native addon reports window lifecycle events through `onEvent`
 * (invoked from a background thread via a ThreadsafeFunction, marshalled onto
 * the libuv loop by napi-rs).
 *
 * The framework keeps the Node.js process alive while at least one window is
 * open and lets it exit naturally once all windows have closed.
 */

import { EventEmitter } from 'node:events';
import { watch as fsWatch, statSync } from 'node:fs';
import { dirname, relative, resolve as resolvePath, sep } from 'node:path';
import { native } from '@leptonjs/native';
import { defineEvents, defineRoutes, event, findEvent, findRoute, route } from '@leptonjs/registry';
import { importSetupFresh } from './helpers';
import { DEFAULT_MAIN_WINDOW } from './helpers/constants';
import { mergeDevRoutes, registerDevMenu } from './helpers/dev-menu';
import { cleanMainWindowId } from './helpers/dev-window';
import { openMainAndOptionalSplash, resolveSplash } from './helpers/splash';
import { bindEvents } from './ipc/bind-events';
import { createIpcMain } from './ipc/ipcMain';
import { buildPreloadScript } from './ipc/preload';
import { createIpcServer } from './ipc/server';
import type {
    ApiDef,
    EventPayload,
    Handler,
    IpcMain,
    IpcServerOptions,
    Route,
    RouteInput,
    RouteMap,
    RouteOutput,
    TypedEvent,
} from './ipc/types';
import { logger } from './logger';
import type {
    AppEvent,
    CreateWindowOptions,
    DevOptions,
    LaunchOptions,
    SplashOptions,
    StartOptions,
    WindowEventListener,
} from './types';
import { WindowEventKind } from './types';

const lifeCycle = new EventEmitter();
const openWindows = new Set<number>();

let keepAliveHandle: NodeJS.Timeout | null = null;
let runningServer: { stop(): Promise<void> } | null = null;

const acquireKeepAlive = (): void => {
    if (keepAliveHandle) return;
    keepAliveHandle = setInterval(() => {}, 1000 * 60 * 60);
};

const releaseKeepAlive = (): void => {
    if (keepAliveHandle !== null) {
        clearInterval(keepAliveHandle);
        keepAliveHandle = null;
    }
};

const onWindowCreated = (id: number): void => {
    openWindows.add(id);
    acquireKeepAlive();
    logger.debug('native', `Window ${id} created (open: ${openWindows.size})`);
};

const onWindowClosed = (id: number, server?: { stop(): Promise<void> }): void => {
    openWindows.delete(id);
    cleanMainWindowId(id);

    logger.debug('native', `Window ${id} closed (open: ${openWindows.size})`);

    if (openWindows.size === 0) {
        const handled = lifeCycle.emit('window-all-closed');

        if (!handled) {
            logger.info('app', 'All windows closed, quitting');
            if (server) void server.stop();
            app.quit();
        }
    }
};

export const app = {
    on: (event: AppEvent, cb: () => void): void => {
        lifeCycle.on(event, cb);
    },
    once: (event: AppEvent, cb: () => void): void => {
        lifeCycle.once(event, cb);
    },
    quit: (code = 0): void => {
        lifeCycle.emit('before-quit');
        releaseKeepAlive();

        const finish = (): void => {
            try {
                native.quit();
            } catch {
                /* native may be unavailable */
            }
            process.exit(code);
        };

        const stop = runningServer?.stop() ?? Promise.resolve();
        runningServer = null;
        const timer = setTimeout(finish, 1000);
        void stop.finally(() => {
            clearTimeout(timer);
            finish();
        });
    },
    /**
     * Launch the application.
     *
     * @param options - The launch options.
     * @returns The IPC main.
     *
     * @deprecated Use `app.start()` instead.
     *
     * @example
     * ```ts
     * const ipcMain = await app.launch({
     *   routes,
     *   title: 'My App',
     *   pageHtml: '<html><body><h1>My App</h1></body></html>',
     * });
     * ```
     */
    launch: async <R extends RouteMap>(options: LaunchOptions<R>): Promise<IpcMain<R>> => {
        const {
            routes,
            title,
            pageHtml,
            assetDir: assetDirOpt,
            splash,
            ready,
            onWindowEvent,
        } = options;

        const assetDir = assetDirOpt ?? process.env.LEPTON_ASSET_DIR;

        if (!pageHtml && !assetDir)
            throw new Error('app.launch: `pageHtml` or `assetDir` is required.');

        if (pageHtml && assetDir)
            throw new Error('app.launch: `pageHtml` and `assetDir` cannot be used together.');

        const serverOptions: IpcServerOptions = {
            ...(pageHtml ? { pageHtml } : {}),
            ...(assetDir ? { assetDir } : {}),
        };
        const server = createIpcServer(routes, serverOptions);
        await server.start();
        runningServer = server;

        const ipcMain = createIpcMain(server);
        ready?.(ipcMain);

        const listener: WindowEventListener = (event) => {
            if (event.kind === WindowEventKind.Created) {
                onWindowCreated(event.id);
            } else if (event.kind === WindowEventKind.Closed) {
                onWindowClosed(event.id, server);
            } else if (event.kind === WindowEventKind.Error) {
                logger.error('native', `Window ${event.id}`, {
                    kind: event.kind,
                    error: event.message ?? 'Unknown',
                });

                if (openWindows.has(event.id)) onWindowClosed(event.id, server);
            }

            onWindowEvent?.(event);
        };

        const preload = buildPreloadScript(server.baseUrl, server.token);

        openMainAndOptionalSplash({
            url: server.baseUrl,
            title,
            preload,
            splash: resolveSplash(splash),
            listener,
            onSpawn: onWindowCreated,
        });
        return ipcMain;
    },
    /**
     * Launch the application in development mode.
     *
     * @param options - The development options.
     * @returns The IPC main.
     *
     * @deprecated Use `app.start()` instead.
     *
     * @example
     * ```ts
     * const ipcMain = await app.dev({
     *   routes,
     *   title: 'My App',
     *   pageHtml: '<html><body><h1>My App</h1></body></html>',
     *   url: 'http://127.0.0.1:5173',
     *   corsOrigin: 'http://127.0.0.1:5173',
     * });
     * ```
     */
    dev: async <R extends RouteMap>(options: DevOptions<R>): Promise<IpcMain<R>> => {
        const { routes, title, url, corsOrigin, setupModule, splash, ready, onWindowEvent } =
            options;

        const watchDirs =
            options.watchDirs ??
            process.env.LEPTON_WATCH_DIRS?.split(',').filter((d) => d.length > 0) ??
            [];

        const server = createIpcServer(routes, { corsOrigin });
        await server.start();
        runningServer = server;

        const ipcMain = createIpcMain<R>(server);
        ready?.(ipcMain);

        let dispose: (() => void) | undefined;

        const runSetup = async (): Promise<void> => {
            try {
                if (typeof dispose === 'function') dispose();
            } catch (e) {
                logger.warn('hmr', `dispose() from previous module threw: ${(e as Error).message}`);
            }

            ipcMain.clearHandlers();

            const backend = await importSetupFresh(setupModule, watchDirs);
            dispose = (backend.setup as (ipc: IpcMain<R>) => (() => void) | undefined)(ipcMain);

            // const href = `${pathToFileURL(setupModule).href}?t=${Date.now()}`;
            // const backend = await esmImport(href);

            // dispose = (backend.setup as (ipc: IpcMain<R>) => (() => void) | undefined)(ipcMain);
        };

        await runSetup();

        const preload = buildPreloadScript(server.baseUrl, server.token);

        const listener: WindowEventListener = (event) => {
            if (event.kind === WindowEventKind.Created) onWindowCreated(event.id);
            else if (event.kind === WindowEventKind.Closed) onWindowClosed(event.id, server);
            else if (event.kind === WindowEventKind.Error) {
                logger.error('native', `Window ${event.id}`, {
                    kind: event.kind,
                    error: event.message ?? 'Unknown',
                });

                if (openWindows.has(event.id)) onWindowClosed(event.id, server);
            }

            onWindowEvent?.(event);
        };

        // native.createWindow(url, title, preload, listener);
        openMainAndOptionalSplash({
            url,
            title,
            preload,
            splash: resolveSplash(splash),
            listener,
            onSpawn: onWindowCreated,
        });

        if (watchDirs.length > 0) {
            let timer: NodeJS.Timeout | null = null;
            const trigger = (): void => {
                if (timer) return;

                timer = setTimeout(() => {
                    timer = null;
                    runSetup()
                        .then(() => logger.info('hmr', 'Backend module reloaded'))
                        .catch((e) =>
                            logger.error(
                                'hmr',
                                `Backend reload failed: ${(e as Error).message}`,
                                e,
                            ),
                        );
                }, 300);
            };

            const watched = new Set<string>();
            const watchers: import('node:fs').FSWatcher[] = [];

            for (const entry of watchDirs) {
                let dir = entry;
                let recursive = true;

                try {
                    if (!statSync(entry).isDirectory()) {
                        dir = dirname(entry);
                        recursive = false;
                    }
                } catch {
                    dir = dirname(entry);
                    recursive = false;
                }

                const key = `${dir}:${recursive}`;
                if (watched.has(key)) continue;
                watched.add(key);

                const watcher = fsWatch(dir, { recursive }, (_e, file) => {
                    if (!file) return;
                    const f = String(file);
                    if (!/\.(ts|js|cjs|mjs)$/.test(f)) return;
                    if (f.includes('node_modules') || f.includes(`dist${sep}`)) return;
                    trigger();
                });

                watchers.push(watcher);
            }

            lifeCycle.once('before-quit', () => {
                if (timer) clearTimeout(timer);
                for (const watcher of watchers) watcher.close();
            });
        }

        return ipcMain;
    },
    start: async <R extends RouteMap>(options: StartOptions<R>): Promise<IpcMain<R>> => {
        const {
            routes: routesOpt,
            api,
            events,
            title,
            splash,
            setup,
            pageHtml,
            assetDir: assetDirOpt,
            onWindowEvent,
        } = options;

        const routes = api?.routes ?? routesOpt;

        if (!routes) throw new Error('app.start: `routes` or `api` is required.');

        const devUrl = process.env.LEPTON_DEV_URL;
        const corsOrigin = process.env.LEPTON_DEV_ORIGIN;
        const setupModule = process.env.LEPTON_SETUP_MODULE;
        const watchDirs =
            process.env.LEPTON_WATCH_DIRS?.split(',').filter((d) => d.length > 0) ?? [];

        const isDev = process.env.LEPTON_DEV === '1' && Boolean(devUrl && corsOrigin);

        const makeListener = (server: { stop(): Promise<void> }): WindowEventListener => {
            return (event) => {
                if (event.kind === WindowEventKind.Created) {
                    onWindowCreated(event.id);
                } else if (event.kind === WindowEventKind.Closed) {
                    onWindowClosed(event.id, server);
                } else if (event.kind === WindowEventKind.Error) {
                    logger.error('native', `Window ${event.id}`, {
                        kind: event.kind,
                        error: event.message ?? 'Unknown',
                    });
                    if (openWindows.has(event.id)) onWindowClosed(event.id, server);
                }
                onWindowEvent?.(event);
            };
        };

        if (isDev) {
            // Development mode: serve the app from the dev server.
            const server = createIpcServer(routes, { corsOrigin: corsOrigin as string });
            await server.start();
            runningServer = server;

            const ipcMain = createIpcMain<R>(server);
            let dispose: (() => void) | undefined;
            const routeTable = routes as RouteMap;
            mergeDevRoutes(routeTable);

            // The IPC server closes over this object. Swap its contents so new
            // routes and schemas are visible without recreating the server.
            const replaceRoutes = (next: RouteMap): void => {
                if (next === routeTable) return;
                const snapshot = { ...next };
                for (const key of Object.keys(routeTable)) delete routeTable[key];
                Object.assign(routeTable, snapshot);
            };

            const runSetup = async (): Promise<void> => {
                const backend = setupModule ? await importSetupFresh(setupModule, watchDirs) : null;

                try {
                    if (typeof dispose === 'function') dispose();
                } catch (e) {
                    logger.warn(
                        'hmr',
                        `dispose() from previous module threw: ${(e as Error).message}`,
                    );
                }

                ipcMain.clearHandlers();
                ipcMain.clearEvents();

                const nextApi = backend?.api ?? api;
                if (nextApi) {
                    replaceRoutes(nextApi.routes);
                    nextApi.register(ipcMain);
                }

                mergeDevRoutes(routeTable);
                registerDevMenu(ipcMain);

                const nextEvents = backend?.events ?? events;
                if (nextEvents) bindEvents(ipcMain, nextEvents);

                if (backend) {
                    dispose =
                        (backend.setup as (ipc: IpcMain<R>) => (() => void) | undefined)?.(
                            ipcMain,
                        ) ?? undefined;
                } else {
                    dispose = setup(ipcMain) ?? undefined;
                }
            };

            await runSetup();

            const preload = buildPreloadScript(server.baseUrl, server.token, true);
            openMainAndOptionalSplash({
                url: devUrl as string,
                title,
                preload,
                splash: resolveSplash(splash),
                listener: makeListener(server),
                onSpawn: onWindowCreated,
            });

            if (setupModule && watchDirs.length > 0) {
                let timer: NodeJS.Timeout | null = null;
                let pendingFile: string | null = null;

                const trigger = (changedFile: string): void => {
                    pendingFile = changedFile;
                    if (timer) return;

                    timer = setTimeout(() => {
                        timer = null;
                        const file = pendingFile ?? 'unknown';
                        pendingFile = null;

                        runSetup()
                            .then(() => logger.info('hmr', `Backend module reloaded: ${file}`))
                            .catch((e) =>
                                logger.error(
                                    'hmr',
                                    `Backend reload failed (${file}): ${(e as Error).message}`,
                                    e,
                                ),
                            );
                    }, 300);
                };

                const watched = new Set<string>();
                const watchers: import('node:fs').FSWatcher[] = [];

                for (const entry of watchDirs) {
                    let dir = entry;
                    let recursive = true;

                    try {
                        if (!statSync(entry).isDirectory()) {
                            dir = dirname(entry);
                            recursive = false;
                        }
                    } catch {
                        dir = dirname(entry);
                        recursive = false;
                    }

                    const key = `${dir}:${recursive}`;
                    if (watched.has(key)) continue;

                    watched.add(key);

                    const watcher = fsWatch(dir, { recursive }, (_e, file) => {
                        if (!file) return;

                        const f = String(file);
                        if (!/\.(ts|js|cjs|mjs)$/.test(f)) return;
                        if (f.includes('node_modules') || f.includes(`dist${sep}`)) return;

                        const abs = resolvePath(dir, f);
                        const rel = relative(process.cwd(), abs).replaceAll('\\', '/');

                        trigger(rel.startsWith('..') ? abs.replaceAll('\\', '/') : rel);
                    });

                    watchers.push(watcher);
                }

                lifeCycle.once('before-quit', () => {
                    if (timer) clearTimeout(timer);
                    for (const watcher of watchers) watcher.close();
                });
            }

            return ipcMain;
        }

        // Production mode: serve the app from the static files.
        const assetDir = assetDirOpt ?? process.env.LEPTON_ASSET_DIR;

        if (!pageHtml && !assetDir)
            throw new Error(
                'app.start: `pageHtml` or `assetDir` (or LEPTON_ASSET_DIR) is required.',
            );

        if (pageHtml && assetDir)
            throw new Error('app.start: `pageHtml` and `assetDir` cannot be used together.');

        const serverOptions: IpcServerOptions = {
            ...(pageHtml ? { pageHtml } : {}),
            ...(assetDir ? { assetDir } : {}),
        };

        const server = createIpcServer(routes, serverOptions);
        await server.start();
        runningServer = server;

        const ipcMain = createIpcMain(server);
        api?.register(ipcMain);
        if (events) bindEvents(ipcMain, events);
        setup?.(ipcMain);

        const preload = buildPreloadScript(server.baseUrl, server.token);

        openMainAndOptionalSplash({
            url: server.baseUrl,
            title,
            preload,
            splash: resolveSplash(splash),
            listener: makeListener(server),
            onSpawn: onWindowCreated,
        });

        return ipcMain;
    },
    /**
     * Create a new window.
     *
     * @param options - The create window options.
     * @returns The window.
     *
     * @example
     * ```ts
     * app.createWindow({
     *   url: 'https://example.com',
     *   title: 'Hello',
     *   onEvent(event) {
     *     if (event.kind === WindowEventKind.Closed) console.log('window closed');
     *   },
     * });
     * ```
     */
    createWindow: (options: CreateWindowOptions): void => {
        const { url, title, onEvent } = options;

        const listener: WindowEventListener = (event) => {
            if (event.kind === WindowEventKind.Created) {
                onWindowCreated(event.id);
            } else if (event.kind === WindowEventKind.Closed) {
                onWindowClosed(event.id);
            } else if (event.kind === WindowEventKind.Error) {
                logger.error('native', `Window ${event.id}`, {
                    kind: event.kind,
                    error: event.message ?? 'Unknown',
                });

                if (openWindows.has(event.id)) onWindowClosed(event.id);
            }
            onEvent?.(event);
        };

        native.createWindow(url, title, null, DEFAULT_MAIN_WINDOW, listener);
    },
};

export { bindEvents } from './ipc/bind-events';
export { defineApi } from './ipc/define-api';
export type {
    ApiDef,
    AppEvent,
    CreateWindowOptions,
    DevOptions,
    EventPayload,
    Handler,
    IpcMain,
    IpcServerOptions,
    LaunchOptions,
    Route,
    RouteInput,
    RouteMap,
    RouteOutput,
    SplashOptions,
    StartOptions,
    TypedEvent,
    WindowEventListener,
};
export { defineEvents, defineRoutes, event, findEvent, findRoute, route, WindowEventKind };
