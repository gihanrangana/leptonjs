/**
 * LeptonJS Desktop — preload script builder.
 *
 * Takes the placeholder client script (`leptonClientScript`) and substitutes
 * the IPC URL + auth token, producing the final JS string injected by the
 * native preload (`WebViewBuilder::with_initialization_script`) before any
 * page script runs.
 *
 * Substitution is done here (not in the client template) so the client script
 * stays a static, placeholder-only asset, and the secret (token) is injected
 * only at window-creation time, in memory — never written to disk or baked
 * into a shipped asset.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leptonClientScript } from './client';

const IPC_URL_PLACEHOLDER = '__LEPTON_IPC_URL__';
const TOKEN_PLACEHOLDER = '__LEPTON_TOKEN__';
const OVERLAY_FILE = 'dev-overlay.js';

const readDevOverlayScript = (): string => {
    const nextToPreload = join(__dirname, OVERLAY_FILE);

    if (existsSync(nextToPreload)) return readFileSync(nextToPreload, 'utf-8');

    // Workspace fallback if dist was not copied yet
    const fromSrc = join(__dirname, '..', '..', 'src', 'ipc', OVERLAY_FILE);
    if (existsSync(fromSrc)) {
        return readFileSync(fromSrc, 'utf8');
    }

    throw new Error(`lepton.dev: overlay not found at ${nextToPreload}`);
};

export const buildPreloadScript = (
    ipcUrl: string,
    token: string,
    injectDevMenu = false,
): string => {
    const client = leptonClientScript
        .replaceAll(IPC_URL_PLACEHOLDER, ipcUrl)
        .replaceAll(TOKEN_PLACEHOLDER, token);

    if (!injectDevMenu) return client;

    return `${client}\n${readDevOverlayScript()}`;
};
