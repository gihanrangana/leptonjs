import type { IpcMain, RouteMap } from '@leptonjs/core';
import { events } from '../events';

export const startClock = <R extends RouteMap>(ipcMain: IpcMain<R>): (() => void) => {
    let n = 0;
    const iv = setInterval(() => {
        n += 1;
        ipcMain.emit(events.clock.tick, n);
    }, 1000);
    return () => clearInterval(iv);
};
