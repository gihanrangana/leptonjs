/**
 * LeptonJS Desktop — static asset serving for the IPC server.
 *
 * Serves built frontend assets (e.g. `client/dist`) with an SPA fallback to
 * `index.html`, so client-side routing works. Path-traversal safe.
 *
 * Uses streaming I/O (`createReadStream`) to avoid blocking the event loop.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.map': 'application/json; charset=utf-8',
};

export const createAssetHandler = (
    assetDir: string,
): ((res: ServerResponse, pathname: string) => boolean) => {
    const root = resolve(assetDir);

    return (res, pathname): boolean => {
        let decoded: string;
        try {
            decoded = decodeURIComponent(pathname);
        } catch {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Bad Request');
            return true;
        }

        const requested = normalize(join(root, decoded));

        if (requested !== root && !requested.startsWith(root + sep)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return true;
        }

        let filePath = requested;
        const hasExt = extname(pathname) !== '';
        if (pathname === '/' || !existsSync(filePath) || !hasExt)
            filePath = join(root, 'index.html');

        if (!existsSync(filePath) || !statSync(filePath).isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return true;
        }

        const mime = MIME[extname(filePath).toLowerCase()] ?? `application/octet-stream`;
        res.writeHead(200, { 'Content-Type': mime });
        createReadStream(filePath).pipe(res);
        return true;
    };
};
