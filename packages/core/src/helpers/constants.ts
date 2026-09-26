import type { NativeWindowOptions } from '../types';

export const DEFAULT_MAIN_WINDOW: NativeWindowOptions = {
    visible: true,
    decorations: true,
    center: true,
};

export const HIDDEN_MAIN_WINDOW: NativeWindowOptions = {
    visible: false,
    decorations: true,
    center: true,
};
