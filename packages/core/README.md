# @leptonjs/core

Node.js runtime for LeptonJS. `app` opens the native window, starts the loopback IPC server, registers routes from `defineApi`, and binds events passed to `app.start`.

## Installation

```bash
npm install @leptonjs/core
```

This pulls in `@leptonjs/native` and `@leptonjs/registry`.

## Quick start

```ts
import { app, defineApi } from '@leptonjs/core';
import { defineEvent, defineEvents, defineRoute } from '@leptonjs/registry';
import z from 'zod';

const getGreeting = defineRoute(z.string(), z.string(), async (name) => `Hello, ${name}!`);
const api = defineApi({ greeting: defineApi({ getGreeting }) });

const events = defineEvents({
    clock: { tick: defineEvent(z.number()) },
});

void app.start({
    api,
    events,
    title: 'My App',
    setup(ipcMain) {
        let n = 0;
        const timer = setInterval(() => {
            n += 1;
            ipcMain.emit(events.clock.tick, n);
        }, 1000);
        return () => clearInterval(timer);
    },
});
```

In an app, put `setup` in `app.ts` and re-export `api` and `events` from that file. Dev reload imports `app.ts`, not `main.ts`.

## API

### `defineApi(tree)`

Walks a tree of `defineRoute` leaves and nested `defineApi` objects. Each leaf's wire name becomes a dotted path (`greeting.getGreeting`). Returns the same tree plus `.routes` and `.register`.

`app.start({ api })` calls `register` for you.

### `app.start(options)`

Works in dev and production. The CLI sets `LEPTON_DEV`, `LEPTON_DEV_URL`, and related variables.

| Option | Required | Description |
| --- | --- | --- |
| `api` | one of `api` or `routes` | Object returned by `defineApi` |
| `routes` | one of `api` or `routes` | Raw route map, if you are not using `defineApi` |
| `events` | no | Tree returned by `defineEvents`. Registered with `bindEvents` |
| `title` | yes | Window title |
| `setup` | yes | Receives `ipcMain`. Return a function to run on dev reload |
| `splash` | no | Splash window options |
| `pageHtml` | no | Inline HTML for a simple production page |
| `assetDir` | no | Built frontend assets in production |
| `onWindowEvent` | no | Native window events |

In dev, the CLI supplies the page URL. In production, set `assetDir` or `pageHtml`, or let the CLI set `LEPTON_ASSET_DIR`.

`setup` should start work such as timers. Do not register routes there when you passed `api`. Do not call `bindEvents` there when you passed `events`.

### Developer menu

When `LEPTON_DEV` is `'1'`, `app.start` registers reserved routes and injects a floating overlay into the main window (not the splash). Production builds do not get either.

| Overlay action | Route | What it does |
| --- | --- | --- |
| Reload UI | `lepton.dev.reloadUi` | Reloads the WebView |
| Open inspect | `lepton.dev.openInspect` | Opens WebView2 DevTools |
| Restart app | `lepton.dev.restartApp` | Exits the backend with code `75` so Vite starts it again |

Do not define your own routes under `lepton.dev`. The overlay is `src/ipc/dev-overlay.js`, copied into `dist` on package build and read at window create.

### `app.on(event, callback)`

| Event | When |
| --- | --- |
| `'window-all-closed'` | Every native window has closed. Unhandled, the process quits |
| `'before-quit'` | Just before exit |

### `app.quit(code?)`

Stops the IPC server, closes windows, and exits. Default code is `0`.

### `app.createWindow(options)`

Opens another native window.

### `IpcMain`

| Method | Description |
| --- | --- |
| `handle(route, handler)` | Register one route by hand |
| `emit(event, payload)` | Validate `payload` and broadcast it on SSE |
| `clearHandlers()` | Drop route handlers. Dev reload calls this |
| `clearEvents()` | Drop event handlers and input subscriptions |

`emit` is for push events (`defineEvent(payloadSchema)`). Input events run their own handler when the page posts to `/__on`.

### `WindowEventKind`

`Created`, `Closed`, and `Error`.

### `SplashOptions`

`image`, `backgroundColor`, `width`, `height`, `minDurationMs`.

## How IPC works

1. An HTTP server binds `127.0.0.1` on a random port and creates a per-process token.
2. The preload script sets `window.__lepton` with `invoke`, `listen`, and `subscribe`.
3. `POST /__ipc` runs a route. Zod checks input and output.
4. `GET /__sse` streams push events.
5. `POST /__on` starts an input event. `POST /__off` stops it.
6. The process stays up while a window is open.

`/__ipc`, `/__on`, `/__off`, and `/__sse` require the header `x-lepton-token`.

## Dev reload

The fresh `app.ts` module is imported after a watched file changes. Its `api` replaces the route table and its `events` are bound again. Export both from `app.ts`:

```ts
export { api } from './api';
export { events } from './events';
```

## Re-exports

From this package: `defineApi`, `bindEvents`, `WindowEventKind`.

From `@leptonjs/registry`: `route`, `defineRoutes`, `event`, `defineEvents`, `findRoute`, `findEvent`.

`defineRoute` and `defineEvent` stay on `@leptonjs/registry`.

## License

MIT
