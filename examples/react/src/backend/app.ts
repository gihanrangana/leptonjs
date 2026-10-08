import type { IpcMain, RouteMap } from '@leptonjs/core';
import { startClock } from './handlers/clock';

export { api } from './api';
export { events } from './events';

export const setup = (ipcMain: IpcMain<RouteMap>): (() => void) => {
    const stopClock = startClock(ipcMain);

    return () => {
        stopClock();
    };
};
