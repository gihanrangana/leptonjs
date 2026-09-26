/// <reference lib="dom" />
import type { EventPayload, Route, RouteInput, RouteOutput, TypedEvent } from '@leptonjs/registry';

export interface LeptonClient {
    invoke(name: string, input: unknown): Promise<unknown>;
    listen(name: string, cb: (data: unknown) => void): () => void;
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
