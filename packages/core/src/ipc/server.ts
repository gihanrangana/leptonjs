/**
 * LeptonJS Desktop — IPC HTTP server.
 *
 * Loopback-only HTTP server providing the typed IPC transport:
 *   - GET  /             → serves the app's HTML page (same-origin, no CORS)
 *   - POST /__ipc        → request/response RPC (zod-validated)
 *   - GET  /__sse        → server→client streaming (Server-Sent Events)
 *
 * Security: `/__ipc` and `/__sse` require header `x-lepton-token` matching the
 * per-instance token injected into the preload script. The HTML page is unauthenticated;
 * the token protects the IPC channel from other local processes.
 */

import { randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { findRoute } from '@leptonjs/registry';
import { logger } from '../logger';
import { createAssetHandler } from './helpers/assets';
import {
    abortRequest,
    BodyTooLargeError,
    errorResponse,
    okResponse,
    readBody,
    send,
} from './helpers/http';
import { applyCors, authorize, isLoopbackHost } from './helpers/security';
import type { Handler, IpcRequest, IpcServer, IpcServerOptions, Route, RouteMap } from './types';

interface RegisteredHandler {
    route: Route<unknown, unknown>;
    handler: Handler<Route<unknown, unknown>>;
}

export const createIpcServer = <R extends RouteMap>(
    routes: R,
    options: IpcServerOptions,
): IpcServer<R> => {
    const handlers = new Map<string, RegisteredHandler>();
    const sseClients = new Set<ServerResponse>();
    const token = randomBytes(24).toString('hex');
    const assetHandler = options.assetDir ? createAssetHandler(options.assetDir) : null;

    let server: Server | null = null;
    let assignedPort = 0;

    const parseIpcRequest = (raw: unknown): IpcRequest | null => {
        if (!raw || typeof raw !== 'object') return null;
        const body = raw as Record<string, unknown>;
        if (typeof body.name !== 'string' || typeof body.id !== 'string') return null;
        return { name: body.name, id: body.id, input: body.input };
    };

    const handleIpc = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        let parsed: IpcRequest | null;

        try {
            parsed = parseIpcRequest(JSON.parse(await readBody(req)));
        } catch (e) {
            if (e instanceof BodyTooLargeError) {
                send(res, 413, errorResponse('', 'Payload too large'));
                abortRequest(req);
                return;
            }
            logger.warn('ipc', 'Received invalid JSON in IPC request');
            send(res, 400, errorResponse('', 'Invalid JSON'));
            return;
        }

        if (!parsed) {
            logger.warn('ipc', 'Received malformed IPC request');
            send(res, 400, errorResponse('', 'Invalid JSON'));
            return;
        }

        const route = findRoute(routes, parsed.name);
        if (!route) {
            logger.warn('ipc', 'Unknown route requested', { route: parsed.name });
            send(res, 404, errorResponse(parsed.id, `unknown route: ${parsed.name}`));
            return;
        }

        const entry = handlers.get(route.name);
        if (!entry) {
            logger.warn('ipc', 'No handler registered for route', {
                route: parsed.name,
            });
            send(res, 404, errorResponse(parsed.id, `no handler registered: ${parsed.name}`));
            return;
        }

        let input: unknown;
        try {
            input = route.inputSchema.parse(parsed.input);
        } catch (e) {
            logger.warn('ipc', `Validation failed for route: ${route.name}`, {
                route: parsed.name,
                error: (e as Error).message,
            });
            send(res, 400, errorResponse(parsed.id, `invalid input: ${(e as Error).message}`));
            return;
        }

        try {
            logger.debug('ipc', `-> ${route.name}`);
            const output = await entry.handler(input);
            const validated = route.outputSchema.parse(output);
            send(res, 200, okResponse(parsed.id, validated));
        } catch (e) {
            logger.error('ipc', `Handler error for route: ${route.name}`, {
                route: parsed.name,
                error: (e as Error).message,
            });
            send(res, 500, errorResponse(parsed.id, `handler error: ${(e as Error).message}`));
        }
    };

    const handleSse = (req: IncomingMessage, res: ServerResponse): void => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });

        res.write(': connected\n\n');

        sseClients.add(res);

        logger.debug('ipc', 'SSE client connected');

        req.on('close', () => {
            sseClients.delete(res);
            res.destroy();
            logger.debug('ipc', 'SSE client disconnected');
        });
    };

    const listener = (req: IncomingMessage, res: ServerResponse): void => {
        try {
            if (assignedPort > 0 && !isLoopbackHost(req, assignedPort)) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('Forbidden');
                abortRequest(req);
                return;
            }

            const url = new URL(req.url ?? '/', 'http://127.0.0.1');
            const pathname = url.pathname;

            if (req.method === 'OPTIONS') {
                applyCors(req, res, options.corsOrigin ?? '');
                res.writeHead(204);
                res.end();
                return;
            }

            if (req.method === 'POST' && pathname === '/__ipc') {
                applyCors(req, res, options.corsOrigin ?? '');

                if (!authorize(req, token)) {
                    logger.warn('server', 'Unauthorized IPC request rejected');
                    send(res, 401, errorResponse('', 'Unauthorized'));
                    abortRequest(req);
                    return;
                }

                void handleIpc(req, res).catch((e) => {
                    logger.error('ipc', 'Unhandled IPC error', { error: (e as Error).message });
                    if (!res.headersSent) {
                        send(res, 500, errorResponse('', 'Internal error'));
                    }
                    abortRequest(req);
                });
                return;
            }

            if (req.method === 'GET' && pathname === '/__sse') {
                applyCors(req, res, options.corsOrigin ?? '');

                if (!authorize(req, token)) {
                    logger.warn('server', 'Unauthorized SSE request rejected');
                    send(res, 401, errorResponse('', 'Unauthorized'));
                    abortRequest(req);
                    return;
                }

                handleSse(req, res);
                return;
            }

            if (req.method === 'GET') {
                if (assetHandler) {
                    if (assetHandler(res, pathname)) return;
                }

                if (pathname === '/' && options.pageHtml !== undefined) {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(options.pageHtml);
                    return;
                }
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('not found');
        } catch (e) {
            logger.error('server', 'Request handler failed', { error: (e as Error).message });
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
            }
            res.end('Internal Server Error');
        }
    };

    return {
        get url(): string {
            return `http://127.0.0.1:${assignedPort}`;
        },
        get baseUrl(): string {
            return `http://127.0.0.1:${assignedPort}`;
        },
        get token(): string {
            return token;
        },
        start() {
            return new Promise<void>((resolve, reject) => {
                server = createServer(listener);
                const onError = (error: Error): void => {
                    reject(error);
                };
                server.once('error', onError);
                server.listen(0, '127.0.0.1', () => {
                    server?.off('error', onError);
                    const addr = server?.address();
                    assignedPort = typeof addr === 'object' && addr ? addr.port : 0;
                    if (assignedPort === 0) {
                        reject(new Error('IPC server bound without a port'));
                        return;
                    }
                    resolve();
                });
            });
        },
        stop() {
            return new Promise<void>((resolve) => {
                for (const client of sseClients) client.destroy();
                sseClients.clear();
                const current = server;
                server = null;
                if (!current) {
                    resolve();
                    return;
                }
                current.close(() => resolve());
            });
        },
        handle<K extends keyof R & string>(route: R[K], handler: Handler<R[K]>): void {
            handlers.set(route.name, {
                route: route as Route<unknown, unknown>,
                handler: handler as Handler<Route<unknown, unknown>>,
            });
        },
        clearHandlers(): void {
            handlers.clear();
        },
        emit(name: string, data: unknown): void {
            const payload = `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
            for (const client of sseClients) client.write(payload);
        },
    };
};
