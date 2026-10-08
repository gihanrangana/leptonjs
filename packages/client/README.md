# @leptonjs/client

Frontend IPC client for LeptonJS. Import the `ipc` singleton, then call routes and events by dotted name. Types come from a `declare module '@leptonjs/client'` merge, not from importing backend handlers into the webview bundle.

## Installation

```bash
npm install @leptonjs/client
```

This runs in the WebView. `window.__lepton` is injected before your page script and talks to the Node IPC server.

## Type the client

```ts
// declarations.d.ts
import type { api } from './src/backend/api';
import type { events } from './src/backend/events';

declare module '@leptonjs/client' {
    interface LeptonApp {
        api: typeof api;
        events: typeof events;
    }
}
```

Include that file in the frontend `tsconfig`. `import type` keeps the backend module out of the bundle.

`LeptonApp` is an interface on this package. A type alias in your app will not merge.

## `ipc`

```ts
import { ipc } from '@leptonjs/client';

const greeting = await ipc.invoke('greeting.getGreeting', 'World');
const same = await ipc.greeting.getGreeting('World');

const stopTick = ipc.on('clock.tick', (n) => {
    console.log(n);
});

const stopShout = ipc.on('echo.shout', 'hello', (result) => {
    console.log(result);
    stopShout();
});
```

| Call | When |
| --- | --- |
| `ipc.invoke(name, input)` | Request/response route. Returns `Promise` of the handler result |
| `ipc.<group>.<method>(input)` | Same route call, nested |
| `ipc.on(name, cb)` | Push event (`defineEvent` with only a payload schema). Returns unsubscribe |
| `ipc.on(name, input, cb)` | Input event. Sends `input`, then calls `cb` with each pushed payload |

`clock.tick` has no input, so a second argument other than the callback is a type error. `echo.shout` requires the string, then the callback.

`on` returns `() => void`. Call it to remove the listener. For an input event it also posts `/__off`.

## Lower-level helpers

`invoke(route, input)` and `listen(event, cb)` take registry objects instead of strings. Prefer `ipc` in app code so the page depends on names from `LeptonApp`.

`createClient()` builds another client with the same shape. The exported `ipc` is that client, already typed by `LeptonApp`.

## React

Use `useEvent` from `@leptonjs/react` for push events that should become state. It does not send a payload. Input events stay on `ipc.on`.

## Bridge

`window.__lepton` is not part of the app-facing API. It exposes `invoke`, `listen`, and `subscribe` for the preload script.

## License

MIT
