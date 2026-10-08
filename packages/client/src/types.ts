import type {
    FlattenEvents,
    FlattenRoutes,
    RouteInput,
    RouteOutput,
    TypedEvent,
} from '@leptonjs/registry';

export type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;

type ClientOf<T> = {
    [K in keyof T as K extends 'routes' | 'register' ? never : K]: T[K] extends {
        readonly handler: (input: infer I) => infer O;
    }
        ? (input: I) => Promise<Awaited<O>>
        : ClientOf<T[K]>;
};

export type EventName<E> = keyof FlattenEvents<E> & string;

export type EventData<E, K extends EventName<E>> =
    FlattenEvents<E>[K] extends TypedEvent<infer Payload, infer _Input> ? Payload : never;

export type EventInput<E, K extends EventName<E>> =
    FlattenEvents<E>[K] extends TypedEvent<infer _Payload, infer Input> ? Input : never;

type ListenEventName<E> = {
    [K in EventName<E>]: EventInput<E, K> extends void ? K : never;
}[EventName<E>];

type InputEventName<E> = {
    // biome-ignore lint/suspicious/noConfusingVoidType: input void means the page sends nothing
    [K in EventName<E>]: [EventInput<E, K>] extends [void] ? never : K;
}[EventName<E>];

export type IpcClient<T, E = Record<string, never>> = ClientOf<T> & {
    invoke: <K extends keyof FlattenRoutes<T> & string>(
        name: K,
        input: RouteInput<FlattenRoutes<T>[K]>,
    ) => Promise<RouteOutput<FlattenRoutes<T>[K]>>;
    on: {
        <K extends ListenEventName<E>>(name: K, cb: (payload: EventData<E, K>) => void): () => void;
        <K extends InputEventName<E>>(
            name: K,
            input: EventInput<E, K>,
            cb: (payload: EventData<E, K>) => void,
        ): () => void;
    };
};
