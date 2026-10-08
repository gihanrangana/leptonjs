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

/** A function that stops an event listener. */
export type EventStop = () => void;

/** Backend handler for a typed event: receives validated input, emits payload. */
export type EventHandler<I, P> = (input: I, emit: (payload: P) => void) => EventStop | undefined;

/** A typed event with payload type `P`. */
export interface TypedEvent<P, I = void> {
    readonly name: string;
    readonly payloadSchema: ZodType<P>;
    readonly inputSchema?: ZodType<I>;
    readonly handler?: EventHandler<I, P>;
}

/** A map of named events — the shape passed to `defineEvents(...)`. */
export type EventMap = Record<string, TypedEvent<unknown>>;

/** Extract the payload type of an event. */
export type EventPayload<E> = E extends TypedEvent<infer P> ? P : never;

/** An emitter for a typed event. */
export type Emitter<E extends TypedEvent<unknown>> = (payload: EventPayload<E>) => void;

export interface DefinedRoute<I, O> extends Route<I, O> {
    readonly handler: (input: I) => O | Promise<O>;
}

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
    k: infer I,
) => void
    ? I
    : never;

/** Dotted route map inferred from a `defineApi` tree. */
export type FlattenRoutes<T, P extends string = ''> = UnionToIntersection<
    {
        [K in keyof T & string]: K extends 'routes' | 'register'
            ? never
            : T[K] extends DefinedRoute<infer I, infer O>
              ? { [Key in Join<P, K>]: DefinedRoute<I, O> }
              : T[K] extends { readonly routes: infer R }
                ? { [RK in keyof R & string as Join<P, `${K}.${RK}`>]: R[RK] }
                : T[K] extends Record<string, unknown>
                  ? FlattenRoutes<T[K], Join<P, K>>
                  : never;
    }[keyof T & string]
>;

/** Dotted event map inferred from a `defineEvents` tree. */
export type FlattenEvents<T, P extends string = ''> = UnionToIntersection<
    {
        [K in keyof T & string]: T[K] extends TypedEvent<infer Payload, infer Input>
            ? { [Key in Join<P, K>]: TypedEvent<Payload, Input> }
            : T[K] extends Record<string, unknown>
              ? FlattenEvents<T[K], Join<P, K>>
              : never;
    }[keyof T & string]
>;
