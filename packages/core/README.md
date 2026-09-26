# @leptonjs/core

The Node.js backend runtime for LeptonJS. This package provides the `app` object that manages native windows, spins up the IPC server, handles route dispatch, emits events to connected renderers, and controls the application lifecycle.

## Installation

```bash
npm install @leptonjs/core
```

This automatically pulls in `@leptonjs/native` (the native addon loader) and `@leptonjs/registry` (shared route/event types).

## Quick Start

```ts
// src/backend/main.ts
import { app } from '@leptonjs/core';
import { routes } from '../shared/routes';

void app.start({
  routes,
  title: 'My App',
  setup(ipcMain) {
    ipcMain.handle(routes.getGreeting, async (name) => {
      return `Hello, ${name}!`;
    });
  },
});
```

## API Reference

### `app.start<R>(options): Promise<IpcMain<R>>`

The **recommended** entry point. Works in both development and production — the CLI sets environment variables (`LEPTON_DEV`, `LEPTON_DEV_URL`, etc.) to switch modes automatically.

```ts
void app.start({
  routes,
  title: 'My App',
  splash: {                          // optional splash screen
    image: 'src/assets/splash.png',
    backgroundColor: '#0f1419',
    width: 520,
    height: 360,
    minDurationMs: 2000,
  },
  setup(ipcMain) {
    // Register handlers and start background work.
    ipcMain.handle(routes.getGreeting, async (name) => `Hello, ${name}!`);

    const interval = setInterval(() => {
      ipcMain.emit(events.tick, Date.now());
    }, 1000);

    // Return a cleanup function (called on HMR re-run in dev).
    return () => clearInterval(interval);
  },
});
```

#### `StartOptions<R>`

| Option | Type | Required | Description |
|---|---|---|---|
| `routes` | `R` (RouteMap) | ✅ | The route definitions created with `defineRoutes(...)` |
| `title` | `string` | ✅ | Window title |
| `setup` | `(ipcMain) => void \| (() => void)` | ✅ | Register handlers and start work. Return a dispose function for HMR cleanup. |
| `splash` | `SplashOptions` | — | Show a splash screen while the app loads |
| `pageHtml` | `string` | — | Inline HTML to serve (production, simple apps) |
| `assetDir` | `string` | — | Directory of built frontend assets (production) |
| `onWindowEvent` | `WindowEventListener` | — | Listen to native window events |

> In production, provide either `pageHtml` or `assetDir` (or set `LEPTON_ASSET_DIR`).
> In dev mode the CLI provides `LEPTON_DEV_URL` automatically so neither is needed.

### `app.on(event, callback)`

Subscribe to application lifecycle events.

| Event | When it fires |
|---|---|
| `'window-all-closed'` | All native windows have been closed. If unhandled, the app quits automatically. |
| `'before-quit'` | Just before the process exits. Use for cleanup. |

```ts
app.on('window-all-closed', () => {
  console.log('All windows closed — quitting');
  app.quit();
});
```

### `app.quit(code?)`

Gracefully shut down the application. Stops the IPC server, closes native windows, and exits with the given code (default `0`).

### `app.createWindow(options)`

Open an additional native window. Useful for multi-window apps.

```ts
app.createWindow({
  url: 'https://example.com',
  title: 'Second Window',
  onEvent(event) {
    if (event.kind === WindowEventKind.Closed) {
      console.log('Second window closed');
    }
  },
});
```

### `IpcMain<R>`

The `ipcMain` object received in the `setup` callback:

| Method | Signature | Description |
|---|---|---|
| `handle` | `(route, handler) => void` | Register a handler for a typed route |
| `emit` | `(event, payload) => void` | Push a typed event to all connected renderers |
| `clearHandlers` | `() => void` | Remove all registered handlers (used internally for HMR) |

### `WindowEventKind`

```ts
enum WindowEventKind {
  Created = 0,
  Closed  = 1,
  Error   = 2,
}
```

### `SplashOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `image` | `string` | — | Path to splash image |
| `backgroundColor` | `string` | — | Window background colour (hex) |
| `width` | `number` | — | Splash window width |
| `height` | `number` | — | Splash window height |
| `minDurationMs` | `number` | — | Minimum time to display the splash (ms) |

## How It Works

1. **IPC Server** — `@leptonjs/core` starts an HTTP server on `127.0.0.1` with a random port and a secret token.
2. **Preload Script** — A script is injected into the WebView that exposes `window.__lepton.invoke()` and `window.__lepton.listen()`, bridging the renderer to the HTTP/SSE server.
3. **Route Dispatch** — Incoming RPC calls are matched against your registered handlers. Input is validated with the Zod schema from `@leptonjs/registry`.
4. **Event Push** — `ipcMain.emit(event, payload)` broadcasts an SSE event to all connected renderers.
5. **Lifecycle** — The Node process stays alive while at least one window is open. When all windows close, `'window-all-closed'` fires.

## Re-exports

For convenience, `@leptonjs/core` re-exports the following from `@leptonjs/registry`:

- `route`, `defineRoutes`, `findRoute`
- `event`, `defineEvents`
- All shared types (`Route`, `RouteMap`, `IpcMain`, `Handler`, etc.)

## License

MIT
