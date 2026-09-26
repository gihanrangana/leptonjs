import type { ZodType } from 'zod';

/** A single typed, runtime-validated IPC route. `I` = input, `O` = output. */
export interface Route<I, O> {
    readonly name: string;
    readonly inputSchema: ZodType<I>;
    readonly outputSchema: ZodType<O>;
}

/** A map of named routes — the shape passed to `defineRoutes(...)`. */
export type RouteMap = Record<string, Route<unknown, unknown>>;

/** Extract the input type of a route. */
export type RouteInput<R> = R extends Route<infer I, unknown> ? I : never;

/** Extract the output type of a route. */
export type RouteOutput<R> = R extends Route<unknown, infer O> ? O : never;

/** Backend handler for a route: receives validated input, returns output. */
export type Handler<R extends Route<unknown, unknown>> = (
    input: RouteInput<R>,
) => RouteOutput<R> | Promise<RouteOutput<R>>;

/** A typed event with payload type `P`. */
export interface TypedEvent<P> {
    readonly name: string;
    readonly payloadSchema: ZodType<P>;
}

/** A map of named events — the shape passed to `defineEvents(...)`. */
export type EventMap = Record<string, TypedEvent<unknown>>;

/** Extract the payload type of an event. */
export type EventPayload<E> = E extends TypedEvent<infer P> ? P : never;

/** An emitter for a typed event. */
export type Emitter<E extends TypedEvent<unknown>> = (payload: EventPayload<E>) => void;
