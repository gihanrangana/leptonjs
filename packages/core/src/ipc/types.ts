/**
 * LeptonJS Desktop — IPC transport types (HTTP / SSE).
 * Shared route/event types live in `@leptonjs/registry`.
 */
import type { DefinedRoute, EventPayload, Handler, RouteMap, TypedEvent } from '@leptonjs/registry';

export type {
    EventMap,
    EventPayload,
    Handler,
    Route,
    RouteInput,
    RouteMap,
    RouteOutput,
    TypedEvent,
} from '@leptonjs/registry';

/** Wire format for an RPC request (POST /__ipc body). */
export interface IpcRequest {
    name: string;
    id: string;
    input: unknown;
}

/** Successful RPC response. */
export interface IpcOkResponse {
    id: string;
    ok: true;
    output: unknown;
}

/** Failed RPC response. */
export interface IpcErrorResponse {
    id: string;
    ok: false;
    error: string;
}

/** Wire format for an RPC response (POST /__ipc reply body). */
export type IpcResponse = IpcOkResponse | IpcErrorResponse;

/** Wire format for a server→client SSE event. */
export interface IpcEvent {
    name: string;
    data: unknown;
}

/** Frontend listener for a typed event with payload type `D`. */
export type EventListener<D> = (data: D) => void;

export interface IpcServer<R extends RouteMap> {
    readonly url: string;
    readonly baseUrl: string;
    readonly token: string;
    start(): Promise<void>;
    stop(): Promise<void>;
    handle<K extends keyof R & string>(route: R[K], handler: Handler<R[K]>): void;
    clearHandlers(): void;
    emit(name: string, data: unknown): void;
    onEvent(name: string, event: TypedEvent<unknown, unknown>): void;
    offEvent(id: string): void;
    clearEvents(): void;
}

export interface IpcServerOptions {
    readonly pageHtml?: string;
    readonly corsOrigin?: string;
    readonly assetDir?: string;
}

export interface LeptonClient {
    invoke(name: string, input: unknown): Promise<unknown>;
    listen(name: string, cb: (data: unknown) => void): () => void;
}

export interface IpcMain<R extends RouteMap> {
    handle<K extends keyof R & string>(route: R[K], handler: Handler<R[K]>): void;
    clearHandlers(): void;
    emit<E extends TypedEvent<unknown>>(event: E, payload: EventPayload<E>): void;
    onEvent(name: string, event: TypedEvent<unknown, unknown>): void;
    offEvent(id: string): void;
    clearEvents(): void;
}

export type ApiLeaf = DefinedRoute<unknown, unknown>;

export type ApiDef<R = RouteMap> = {
    readonly routes: R;
    readonly register: (ipcMain: IpcMain<RouteMap>) => void;
};
