/**
 * LeptonJS Desktop — hello world with typed IPC + multi-window.
 *
 * Run with:  pnpm dev
 *
 * Demonstrates the polished Phase 2 surface:
 *   - typed, zod-validated RPC route (`getGreeting`)
 *   - typed, zod-validated SSE event (`tick`)
 *   - multi-window lifecycle (a second window opens after 2s; process exits
 *     only when both close)
 */

import { readFileSync } from 'node:fs';
import z from 'zod';
import { app, defineRoutes, route, WindowEventKind } from '../../src';
import { defineEvents, event } from '../../src/ipc/registry';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf-8');

const routes = defineRoutes({
    getGreeting: route('getGreeting', z.string(), z.string()),
});

const events = defineEvents({
    tick: event('tick', z.number()),
});

let tickInterval: NodeJS.Timeout | null = null;

app.on('window-all-closed', () => {
    console.log('[hello] all windows closed - quiting');
});

void app.launch({
    routes,
    title: 'LeptonJS Desktop - Hello (1)',
    pageHtml: html,
    ready(ipcMain) {
        ipcMain.handle(routes.getGreeting, async (name) => `Hello, ${name}`);

        let n = 0;
        tickInterval = setInterval(() => {
            n += 1;
            ipcMain.emit(events.tick, n);
        }, 1000);

        setTimeout(() => {
            void app.launch({
                routes,
                title: 'LeptonJS Desktop - Hello (2)',
                pageHtml: html,
            });
        }, 2000);
    },
    onWindowEvent(event) {
        switch (event.kind) {
            case WindowEventKind.Created:
                console.log('[hello] window created');
                break;
            case WindowEventKind.Closed:
                console.log('[hello] window', event.id, 'closed');
                if (tickInterval) {
                    clearInterval(tickInterval);
                    tickInterval = null;
                }
                break;
            case WindowEventKind.Error:
                console.error('[hello] window error:', event.message ?? 'unknown');
                break;
        }
    },
});
