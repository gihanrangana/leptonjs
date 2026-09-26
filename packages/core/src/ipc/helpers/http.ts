/**
 * LeptonJS Desktop — IPC HTTP helpers.
 *
 * Pure, transport-agnostic helpers for reading request bodies and writing
 * JSON RPC responses. No closures, no state — safe to reuse and unit-test.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { IpcErrorResponse, IpcOkResponse, IpcResponse } from '../types';

export const MAX_IPC_BODY_BYTES = 1_048_576;

export class BodyTooLargeError extends Error {
    readonly statusCode = 413;

    constructor() {
        super('Request body too large');
        this.name = 'BodyTooLargeError';
    }
}

export const readBody = (req: IncomingMessage): Promise<string> => {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let settled = false;

        const fail = (error: Error): void => {
            if (settled) return;
            settled = true;
            req.resume();
            req.destroy();
            reject(error);
        };

        req.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_IPC_BODY_BYTES) {
                fail(new BodyTooLargeError());
                return;
            }
            chunks.push(chunk);
        });

        req.on('end', () => {
            if (settled) return;
            settled = true;
            resolve(Buffer.concat(chunks).toString('utf8'));
        });

        req.on('error', (error) => {
            if (settled) return;
            settled = true;
            reject(error);
        });
    });
};

export const abortRequest = (req: IncomingMessage): void => {
    req.resume();
    req.destroy();
};

export const send = (res: ServerResponse, status: number, body: IpcResponse): void => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
};

export const errorResponse = (id: string, error: string): IpcErrorResponse => ({
    id,
    ok: false,
    error,
});
export const okResponse = (id: string, output: unknown): IpcOkResponse => ({
    id,
    ok: true,
    output,
});
