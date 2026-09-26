import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { native } from '@leptonjs/native';
import { logger } from '../logger';
import {
    type NativeWindowOptions,
    type SplashOptions,
    WindowEventKind,
    type WindowEventListener,
} from '../types';
import { parseHexColorToRgba } from '.';
import { DEFAULT_MAIN_WINDOW, HIDDEN_MAIN_WINDOW } from './constants';

const isSafeColor = (value: string): boolean =>
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value) ||
    /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(value);

export const createSplashHtml = (
    splash: SplashOptions,
    appRoot: string = process.cwd(),
): string => {
    const imagePath = resolve(appRoot, splash.image);
    if (!existsSync(imagePath)) throw new Error(`Splash image not found: ${imagePath}`);

    const ext = imagePath.split('.').pop()?.toLowerCase() || 'png';
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
    const base64 = readFileSync(imagePath).toString('base64');

    const bg = splash.backgroundColor || '#222222';
    if (!isSafeColor(bg)) throw new Error(`Splash backgroundColor is not a safe CSS color: ${bg}`);

    const htmlContent = `<!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                margin: 0;
                padding: 0;
                background-color: ${bg};
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                overflow: hidden;
            }
            img { max-width: 80%; max-height: 80%; }
        </style>
    </head>
    <body>
        <img src="data:${mime};base64,${base64}" />
    </body>
    </html>`;

    return `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
};

export const readSplashFromEnv = (): SplashOptions | undefined => {
    const raw = process.env.LEPTON_SPLASH;
    if (!raw) return undefined;

    try {
        return JSON.parse(raw) as SplashOptions;
    } catch {
        logger.warn('app', 'Ignoring invalid LEPTON_SPLASH env JSON');
        return undefined;
    }
};

export const resolveSplash = (explicit?: SplashOptions): SplashOptions | undefined =>
    explicit ?? readSplashFromEnv();

export const openMainAndOptionalSplash = (args: {
    url: string;
    title: string;
    preload: string | null;
    splash: SplashOptions | undefined;
    listener: WindowEventListener;
    onSpawn: (id: number) => void;
}): void => {
    const { url, title, preload, splash, listener, onSpawn } = args;

    const openMain = (opts: NativeWindowOptions): void => {
        const id = native.createWindow(url, title, preload, opts, listener);
        onSpawn(id);
    };

    if (!splash) {
        openMain(DEFAULT_MAIN_WINDOW);
        return;
    }

    let splashHtml: string;
    try {
        splashHtml = createSplashHtml(splash);
    } catch (e) {
        logger.warn('native', `Splash skipped: ${(e as Error).message}`);
        openMain(DEFAULT_MAIN_WINDOW);
        return;
    }
    const bg = splash.backgroundColor ?? '#222222';
    const rgba = parseHexColorToRgba(bg);

    const splashOpts: NativeWindowOptions = {
        visible: false,
        decorations: false,
        center: true,
        width: splash.width ?? 480,
        height: splash.height ?? 320,
        ...(rgba ? { backgroundColor: rgba } : {}),
    };

    const splashOpenedAt = Date.now();
    const minMs = splash.minDurationMs ?? 300;

    let splashId = 0;

    const dismissSplash = (): void => {
        if (splashId === 0) return;
        try {
            native.closeWindow(splashId);
        } catch {
            /* splash already gone */
        }
    };

    try {
        splashId = native.createWindow(splashHtml, '', null, splashOpts, (event) => {
            if (event.kind === WindowEventKind.Created) {
                try {
                    native.showWindow(event.id);
                } catch {
                    /* splash already gone */
                }
            } else if (event.kind === WindowEventKind.Error) {
                logger.error('native', `Splash window ${event.id}`, {
                    kind: event.kind,
                    error: event.message ?? 'Unknown',
                });
            }
            listener(event);
        });
    } catch (e) {
        logger.error('native', 'Failed to create splash window', {
            error: (e as Error).message,
        });
        openMain(DEFAULT_MAIN_WINDOW);
        return;
    }
    onSpawn(splashId);

    let mainId = 0;
    try {
        mainId = native.createWindow(url, title, preload, HIDDEN_MAIN_WINDOW, (event) => {
            if (event.kind === WindowEventKind.Created) {
                const wait = Math.max(0, minMs - (Date.now() - splashOpenedAt));
                setTimeout(() => {
                    try {
                        native.showWindow(event.id);
                    } catch {
                        /* main already gone */
                    }
                    dismissSplash();
                }, wait);
            } else if (
                event.kind === WindowEventKind.Error ||
                event.kind === WindowEventKind.Closed
            ) {
                dismissSplash();
            }
            listener(event);
        });
    } catch (e) {
        logger.error('native', 'Failed to create main window', {
            error: (e as Error).message,
        });
        dismissSplash();
        openMain(DEFAULT_MAIN_WINDOW);
        return;
    }
    onSpawn(mainId);
};
