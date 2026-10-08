import type { FlattenRoutes } from '@leptonjs/registry';
import type { ApiDef, ApiLeaf, IpcMain, RouteMap } from './types';

const isLeaf = (value: unknown): value is ApiLeaf =>
    typeof value === 'object' &&
    value !== null &&
    'handler' in value &&
    typeof (value as ApiLeaf).handler === 'function';

const isApiDef = (value: unknown): value is ApiDef =>
    typeof value === 'object' &&
    value !== null &&
    'routes' in value &&
    'register' in value &&
    typeof (value as ApiDef).register === 'function';

export const defineApi = <T extends Record<string, unknown>>(
    tree: T,
): T & ApiDef<FlattenRoutes<T>> => {
    const routes: RouteMap = {};
    const named: ApiLeaf[] = [];

    const add = (path: string, leaf: ApiLeaf): void => {
        if (routes[path]) throw new Error(`defineApi: dupicate route "${path}"`);

        const route = { ...leaf, name: path };
        routes[path] = route;
        named.push(route);
    };

    const walk = (node: Record<string, unknown>, prefix: string): void => {
        for (const [key, value] of Object.entries(node)) {
            const path = prefix === '' ? key : `${prefix}.${key}`;

            if (isLeaf(value)) add(path, value);
            else if (isApiDef(value)) {
                for (const [name, route] of Object.entries(value.routes)) {
                    add(`${path}.${name}`, route as ApiLeaf);
                }
            } else if (typeof value === 'object' && value !== null) {
                walk(value as Record<string, unknown>, path);
            }
        }
    };

    walk(tree, '');

    return Object.assign(tree, {
        routes: routes as FlattenRoutes<T>,
        register: (ipcMain: IpcMain<RouteMap>) => {
            for (const route of named) {
                ipcMain.handle(route, route.handler);
            }
        },
    }) as T & ApiDef<FlattenRoutes<T>>;
};
