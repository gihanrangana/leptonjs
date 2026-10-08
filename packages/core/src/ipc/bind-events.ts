import type { TypedEvent } from '@leptonjs/registry';

type EventTarget = {
    onEvent: (name: string, event: TypedEvent<unknown, unknown>) => void;
    clearEvents: () => void;
};

const isEvent = (value: unknown): value is TypedEvent<unknown, unknown> =>
    typeof value === 'object' && value !== null && 'payloadSchema' in value && 'name' in value;

export const bindEvents = (ipcMain: EventTarget, tree: Record<string, unknown>): (() => void) => {
    const walk = (node: Record<string, unknown>): void => {
        for (const value of Object.values(node)) {
            if (!value || typeof value !== 'object') continue;
            if (isEvent(value)) ipcMain.onEvent(value.name, value);
            else walk(value as Record<string, unknown>);
        }
    };

    walk(tree);
    return () => {
        ipcMain.clearEvents();
    };
};
