import type { IpcMain } from '@leptonjs/core';
import { routes } from '@shared/routes';

export const registerGreeting = (ipcMain: IpcMain<typeof routes>): void => {
    ipcMain.handle(routes.getGreeting, async (name) => `Hello1, ${name}!`);
};
