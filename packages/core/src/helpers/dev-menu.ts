import { native } from '@leptonjs/native';
import { defineRoute, type RouteMap } from '@leptonjs/registry';
import z from 'zod';
import { defineApi } from '../ipc/define-api';
import type { IpcMain } from '../ipc/types';
import { BACKEND_RESTART_EXIT } from './constants';
import { getMainWindowId } from './dev-window';

const none = z.null();

const openInspect = defineRoute(none, none, async () => {
    native.openDevTools(getMainWindowId());
    return null;
});

const reloadUi = defineRoute(none, none, async () => {
    native.reloadWindow(getMainWindowId());
    return null;
});

const restartApp = defineRoute(none, none, async () => {
    setTimeout(() => {
        process.exit(BACKEND_RESTART_EXIT);
    }, 0);
    return null;
});

export const leptonDevApi = defineApi({
    lepton: defineApi({
        dev: defineApi({
            openInspect,
            reloadUi,
            restartApp,
        }),
    }),
});

export const mergeDevRoutes = (routesTable: RouteMap): void => {
    Object.assign(routesTable, leptonDevApi.routes);
};

export const registerDevMenu = (ipcMain: IpcMain<RouteMap>): void => {
    leptonDevApi.register(ipcMain);
};
