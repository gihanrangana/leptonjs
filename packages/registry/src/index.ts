import { type ZodType, z } from 'zod';
import type { DefinedRoute, EventHandler, EventMap, Route, RouteMap, TypedEvent } from './types';

export type {
    DefinedRoute,
    Emitter,
    EventMap,
    EventPayload,
    EventStop,
    FlattenEvents,
    FlattenRoutes,
    Handler,
    Route,
    RouteInput,
    RouteMap,
    RouteOutput,
    TypedEvent,
} from './types';

export function route<S extends ZodType, R extends ZodType = ZodType<unknown>>(
    name: string,
    inputSchema: S,
    outputSchema: R = z.unknown() as unknown as R,
): Route<z.output<S>, z.output<R>> {
    return { name, inputSchema, outputSchema } as Route<z.output<S>, z.output<R>>;
}

export function defineRoutes<R extends RouteMap>(routes: R): R {
    return routes;
}

export function defineRoute<S extends ZodType, R extends ZodType>(
    inputSchema: S,
    outputSchema: R,
    handler: (input: z.output<S>) => z.output<R> | Promise<z.output<R>>,
): DefinedRoute<z.output<S>, z.output<R>> {
    return { name: '', inputSchema, outputSchema, handler } as DefinedRoute<
        z.output<S>,
        z.output<R>
    >;
}

export function findRoute<R extends RouteMap>(routes: R, name: string): R[keyof R] | undefined {
    return (Object.values(routes) as Array<R[keyof R]>).find((item) => item.name === name);
}

export const event = <S extends ZodType>(
    name: string,
    payloadSchema: S,
): TypedEvent<z.output<S>> => {
    return { name, payloadSchema } as TypedEvent<z.output<S>>;
};

const isEvent = (value: unknown): value is { name: string } =>
    typeof value === 'object' && value !== null && 'payloadSchema' in value && 'name' in value;

type AnyDefinedEvent = {
    readonly name: string;
    readonly payloadSchema: ZodType;
    readonly inputSchema?: ZodType;
    readonly handler?: EventHandler<never, unknown>;
};

export function defineEvent<S extends ZodType>(payloadSchema: S): TypedEvent<z.output<S>, void>;

export function defineEvent<I extends ZodType, S extends ZodType>(
    inputSchema: I,
    payloadSchema: S,
    handler: EventHandler<z.output<I>, z.output<S>>,
): TypedEvent<z.output<S>, z.output<I>>;

export function defineEvent(
    first: ZodType,
    payloadSchema?: ZodType,
    handler?: EventHandler<never, unknown>,
): AnyDefinedEvent {
    if (payloadSchema === undefined) {
        return { name: '', payloadSchema: first };
    }
    if (handler === undefined) {
        return { name: '', inputSchema: first, payloadSchema };
    }
    return { name: '', inputSchema: first, payloadSchema, handler };
}

export const defineEvents = <T extends Record<string, unknown>>(tree: T): T => {
    const walk = (node: Record<string, unknown>, prefix: string): void => {
        for (const [key, value] of Object.entries(node)) {
            const path = prefix === '' ? key : `${prefix}.${key}`;
            if (isEvent(value)) (value as { name: string }).name = path;
            else if (typeof value === 'object' && value !== null) {
                walk(value as Record<string, unknown>, path);
            }
        }
    };

    walk(tree, '');
    return tree;
};

export const findEvent = <E extends EventMap>(events: E, name: string): E[keyof E] | undefined => {
    return (Object.values(events) as Array<E[keyof E]>).find((item) => item.name === name);
};
