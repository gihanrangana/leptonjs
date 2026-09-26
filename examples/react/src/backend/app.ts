import type { IpcMain } from '@leptonjs/core';
import { events } from '@shared/events';
import { routes } from '@shared/routes';
import { startClock } from './handlers/clock';
import { registerGreeting } from './handlers/greeting';

export { events, routes };

export const setup = (ipcMain: IpcMain<typeof routes>): (() => void) => {
    registerGreeting(ipcMain);

    const stopClock = startClock(ipcMain);

    return () => {
        stopClock();
    };
};
