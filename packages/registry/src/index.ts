import { type ZodType, z } from 'zod';
import type { EventMap, Route, RouteMap, TypedEvent } from './types';

export type {
    Emitter,
    EventMap,
    EventPayload,
    Handler,
    Route,
    RouteInput,
    RouteMap,
    RouteOutput,
    TypedEvent,
} from './types';

export function route<I, O = unknown>(
    name: string,
    inputSchema: ZodType<I>,
    outputSchema: ZodType<O> = z.unknown() as unknown as z.ZodType<O>,
): Route<I, O> {
    return { name, inputSchema, outputSchema };
}

export function defineRoutes<R extends RouteMap>(routes: R): R {
    return routes;
}

export function findRoute<R extends RouteMap>(routes: R, name: string): R[keyof R] | undefined {
    return (Object.values(routes) as Array<R[keyof R]>).find((item) => item.name === name);
}

export const event = <P>(name: string, payloadSchema: z.ZodType<P>): TypedEvent<P> => {
    return { name, payloadSchema };
};

export const defineEvents = <E extends EventMap>(events: E): E => {
    return events;
};

export const findEvent = <E extends EventMap>(events: E, name: string): E[keyof E] | undefined => {
    return (Object.values(events) as Array<E[keyof E]>).find((item) => item.name === name);
};
