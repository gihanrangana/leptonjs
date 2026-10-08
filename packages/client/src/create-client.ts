import type { FlattenRoutes, RouteInput, RouteOutput } from '@leptonjs/registry';
import type { IpcClient } from './types';

export const createClient = <A, E = Record<string, never>>(): IpcClient<A, E> => {
    const typedInvoke = <K extends keyof FlattenRoutes<A> & string>(
        name: K,
        input: RouteInput<FlattenRoutes<A>[K]>,
    ): Promise<RouteOutput<FlattenRoutes<A>[K]>> =>
        window.__lepton.invoke(name, input) as Promise<RouteOutput<FlattenRoutes<A>[K]>>;

    const on = (
        name: string,
        inputOrCb: unknown,
        maybeCb?: (payload: unknown) => void,
    ): (() => void) => {
        if (typeof inputOrCb === 'function') {
            return window.__lepton.listen(name, inputOrCb as (data: unknown) => void);
        }
        return window.__lepton.subscribe(name, inputOrCb, maybeCb as (payload: unknown) => void);
    };

    const createNode = (prefix: string): ((input: unknown) => Promise<unknown>) => {
        const fn = (input: unknown): Promise<unknown> => window.__lepton.invoke(prefix, input);

        return new Proxy(fn, {
            get: (_target, key) => {
                if (typeof key !== 'string' || key === 'then') return undefined;
                if (prefix === '' && key === 'invoke') return typedInvoke;
                if (prefix === '' && key === 'on') return on;

                const path = prefix.length === 0 ? key : `${prefix}.${key}`;
                return createNode(path);
            },
        });
    };

    return createNode('') as unknown as IpcClient<A, E>;
};
