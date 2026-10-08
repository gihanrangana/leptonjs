/**
 * LeptonJS Desktop — `ipcMain` public API.
 *
 * Electron-like surface for the backend side of the IPC bridge:
 *   - `ipcMain.handle(route, handler)` registers a typed, zod-validated RPC
 *     handler. The handler's argument and return types are inferred from the
 *     route, so a wrong signature fails at compile time.
 *   - `ipcMain.emit(name, data)` broadcasts a named event to every connected
 *     frontend via SSE.
 *
 * This is a thin facade over `IpcServer` (see `src/ipc/server.ts`). The server
 * owns the transport; `ipcMain` owns the public contract. Keeping them
 * separate lets the transport change without breaking user code.
 */

import type { IpcMain, IpcServer, RouteMap } from './types';

export const createIpcMain = <R extends RouteMap>(server: IpcServer<R>): IpcMain<R> => {
    return {
        handle: (route, handler) => {
            server.handle(route, handler);
        },
        clearHandlers: () => {
            server.clearHandlers();
        },
        emit: (event, payload) => {
            let validated: unknown;

            try {
                validated = event.payloadSchema.parse(payload);
            } catch (e) {
                throw new Error(
                    `ipcMain.emit(${event.name}): invalid payload: ${(e as Error).message}`,
                );
            }
            server.emit(event.name, validated);
        },
        onEvent: (name, event) => {
            server.onEvent(name, event);
        },
        offEvent: (id) => {
            server.offEvent(id);
        },
        clearEvents: () => {
            server.clearEvents();
        },
    };
};
