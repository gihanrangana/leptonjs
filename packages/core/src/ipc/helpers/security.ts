/**
 * LeptonJS Desktop — IPC auth + CORS helpers.
 *
 * Param-based (no closures) so they can be unit-tested and reused across
 * server instances.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Authorize the request.
 * @param req - The request.
 * @param token - The token.
 * @returns True if the request is authorized, false otherwise.
 */
export const authorize = (req: IncomingMessage, token: string): boolean => {
    const header = req.headers['x-lepton-token'];
    const value = Array.isArray(header) ? header[0] : header;
    return value === token;
};

export const isLoopbackHost = (req: IncomingMessage, port: number): boolean => {
    const raw = req.headers.host;
    if (!raw) return false;

    const host = raw.split(',')[0]?.trim().toLowerCase() ?? '';
    return host === `127.0.0.1:${port}` || host === `localhost:${port}` || host === `[::1]:${port}`;
};

/**
 * Apply CORS to the response.
 * @param req - The request.
 * @param res - The response.
 * @param corsOrigin - The CORS origin.
 */
const loopbackHosts = new Set(['127.0.0.1', 'localhost']);

const originsMatch = (origin: string, allowed: string): boolean => {
    if (origin === allowed) return true;

    try {
        const a = new URL(origin);
        const b = new URL(allowed);
        return (
            a.protocol === b.protocol &&
            a.port === b.port &&
            loopbackHosts.has(a.hostname) &&
            loopbackHosts.has(b.hostname)
        );
    } catch {
        return false;
    }
};

export const applyCors = (req: IncomingMessage, res: ServerResponse, corsOrigin: string): void => {
    if (!corsOrigin) return;

    const origin = req.headers.origin;

    if (origin && originsMatch(origin, corsOrigin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-lepton-token');
    }
};
