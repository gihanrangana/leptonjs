import type { NativeWindowOptions } from '../types';

/** Must match `BACKEND_RESTART_EXIT` in `@leptonjs/vite`. */
export const BACKEND_RESTART_EXIT = 75;

export const DEFAULT_MAIN_WINDOW: NativeWindowOptions = {
    visible: true,
    decorations: true,
    center: true,
    devTools: process.env.LEPTON_DEV === '1',
};

export const HIDDEN_MAIN_WINDOW: NativeWindowOptions = {
    visible: false,
    decorations: true,
    center: true,
    devTools: process.env.LEPTON_DEV === '1',
};
