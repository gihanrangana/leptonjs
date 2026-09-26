/**
 * Shared type definitions for `@leptonjs/core`.
 */
import type { IpcMain, RouteMap } from './ipc/types';

export type {
    NativeModule,
    NativeWindowOptions,
    WindowEvent,
    WindowEventListener,
} from '@leptonjs/native';
export { WindowEventKind } from '@leptonjs/native';

import type { WindowEventListener } from '@leptonjs/native';

/** Options for displaying a splash screen. */
export interface SplashOptions {
    image: string;
    backgroundColor?: string;
    width?: number;
    height?: number;
    minDurationMs?: number;
}

/**
 * Options accepted by `app.createWindow(...)`.
 *
 * @property url - The URL to load in the webview.
 * @property title - The title of the window.
 */
export interface CreateWindowOptions {
    /** The URL to load in the webview. */
    url: string;
    /** The title of the window. */
    title: string;
    /** The function to call when an event occurs. */
    onEvent?: WindowEventListener;
}

/** The name of an application event. */
export type AppEvent = 'window-all-closed' | 'before-quit';

/**
 * Launch options.
 *
 * @param routes - The routes to use.
 * @param title - The title of the window.
 * @param pageHtml - The HTML page to serve.
 * @param splash - The options for displaying a splash screen.
 * @param ready - The function to call when the IPC main is ready.
 * @param onWindowEvent - The function to call when a window event occurs.
 *
 * @deprecated Use `StartOptions<R>` instead.
 */
export interface LaunchOptions<R extends RouteMap> {
    readonly routes: R;
    readonly title: string;
    readonly pageHtml?: string;
    readonly assetDir?: string;
    readonly splash?: SplashOptions;
    ready?: (ipcMain: IpcMain<R>) => void;
    onWindowEvent?: WindowEventListener;
}

/**
 * Development options.
 *
 * @param routes - The routes to use.
 * @param title - The title of the window.
 * @param ready - The function to call when the IPC main is ready.
 * @param onWindowEvent - The function to call when a window event occurs.
 * @param corsOrigin - The origin to allow CORS for.
 * @param setupModule - The module to use for setup.
 * @param watchDirs - The directories to watch for changes.
 * @param splash - The options for displaying a splash screen.
 *
 * @deprecated Use `StartOptions<R>` instead.
 */
export interface DevOptions<R extends RouteMap>
    extends Omit<LaunchOptions<R>, 'pageHtml' | 'assetDir'> {
    readonly url: string;
    readonly corsOrigin: string;
    readonly setupModule: string;
    readonly watchDirs?: string[];
    readonly splash?: SplashOptions;
}

/**
 * Start options.
 *
 * @param routes - The routes to use.
 * @param title - The title of the window.
 * @param splash - The options for displaying a splash screen.
 * @param setup - The function to call when the IPC main is ready.
 * @param pageHtml - The HTML page to serve.
 * @param assetDir - The directory to serve assets from.
 * @param onWindowEvent - The function to call when a window event occurs.
 */

export interface StartOptions<R extends RouteMap> {
    readonly routes: R;
    readonly title: string;
    readonly splash?: SplashOptions;
    readonly setup: (ipcMain: IpcMain<R>) => undefined | (() => void);
    readonly pageHtml?: string;
    readonly assetDir?: string;
    readonly onWindowEvent?: WindowEventListener;
}
