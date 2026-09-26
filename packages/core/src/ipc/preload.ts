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

import { leptonClientScript } from './client';

const IPC_URL_PLACEHOLDER = '__LEPTON_IPC_URL__';
const TOKEN_PLACEHOLDER = '__LEPTON_TOKEN__';

export const buildPreloadScript = (ipcUrl: string, token: string): string => {
    return leptonClientScript
        .replaceAll(IPC_URL_PLACEHOLDER, ipcUrl)
        .replaceAll(TOKEN_PLACEHOLDER, token);
};
