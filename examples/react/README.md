# LeptonJS React example

A desktop window with three IPC calls:

- `greeting.getGreeting` asks the backend for `Hello, <name>!`.
- `clock.tick` is a push event. The number on the page updates every second.
- `echo.shout` sends a string and shows the uppercase result.

## Run from this repo

Install and build the workspace from the repository root first (`pnpm install` and `pnpm build`). Then:

```bash
pnpm leptonjs -- dev react
```

That starts Vite, the Node backend, and a WebView2 window. A floating **Dev** button is in the window: reload the UI, open inspect, or restart the backend. Node must be 22.23 or newer, on Windows x64, with the WebView2 Evergreen runtime installed.

Other commands, from the repository root:

```bash
pnpm leptonjs -- build react --no-tui
pnpm leptonjs -- start react --no-tui
pnpm leptonjs -- pack react --no-tui --no-installer
```

`npm run dev` inside this folder starts Vite alone. It does not open the native window. Use `leptonjs dev`.

## Layout

```
declarations.d.ts                 types for ipc (import type only)
src/backend/main.ts                app.start({ api, events, setup })
src/backend/app.ts                 clock setup; re-exports api and events
src/backend/api.ts                 defineApi({ greeting })
src/backend/events.ts              clock.tick and echo.shout
src/backend/handlers/greeting.ts   defineRoute handler
src/backend/handlers/clock.ts      emits clock.tick
src/frontend/App.tsx               invoke, useEvent, ipc.on
```

`declarations.d.ts` is included by `tsconfig.app.json`. That is what makes `ipc.invoke` and `ipc.on` suggest real names.

`src/backend/app.ts` is the file dev reload imports. It re-exports `api` and `events`, so a saved route or event handler replaces the one from process start.

## What the page does

`useEvent('clock.tick', 0)` stores the latest tick. The `0` is only the first paint.

`ipc.on('clock.tick', ...)` listens to the same stream and stores it as "Heard". The effect returns the unsubscribe function.

Greet calls `ipc.invoke('greeting.getGreeting', name)`.

Shout calls `ipc.on('echo.shout', text, ...)`, then unsubscribes after the first result.

Restart `leptonjs dev` after rebuilding `@leptonjs/core` or `@leptonjs/client`. The preload script is injected when the window opens.
