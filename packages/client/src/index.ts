/// <reference lib="dom" />
import type { EventPayload, Route, RouteInput, RouteOutput, TypedEvent } from '@leptonjs/registry';
import { createClient } from './create-client';
import type { IpcClient } from './types';

export interface LeptonClient {
    invoke(name: string, input: unknown): Promise<unknown>;
    listen(name: string, cb: (data: unknown) => void): () => void;
    subscribe(name: string, input: unknown, cb: (data: unknown) => void): () => void;
}

declare global {
    interface Window {
        __lepton: LeptonClient;
    }
}

export const invoke = <I, O>(
    route: Route<I, O>,
    input: RouteInput<Route<I, O>>,
): Promise<RouteOutput<Route<I, O>>> =>
    window.__lepton.invoke(route.name, input) as Promise<RouteOutput<Route<I, O>>>;

export const listen = <E extends TypedEvent<unknown>>(
    event: E,
    cb: (payload: EventPayload<E>) => void,
): (() => void) => window.__lepton.listen(event.name, cb as (data: unknown) => void);

export interface LeptonApp {
    readonly __brand?: 'lepton';
}
export type RegisterdApi = LeptonApp extends { api: infer A } ? A : Record<string, never>;
export type RegisteredEvents = LeptonApp extends { events: infer E } ? E : Record<string, never>;

export const ipc: IpcClient<RegisterdApi, RegisteredEvents> = createClient<
    RegisterdApi,
    RegisteredEvents
>();

export { createClient } from './create-client';

export type { EventData, EventInput, EventName, IpcClient } from './types';
