# @leptonjs/client

The renderer-side (frontend) IPC client for LeptonJS. Provides two functions — `invoke` and `listen` — that let your frontend code call backend routes and subscribe to server-pushed events with **full type safety**.

## Installation

```bash
npm install @leptonjs/client
```

> This package is designed to run **inside the WebView** renderer (browser context). It communicates with the Node.js backend through the `window.__lepton` bridge that LeptonJS injects automatically.

## API Reference

### `invoke<I, O>(route, input): Promise<O>`

Call a backend route and await the typed response.

```ts
import { invoke } from '@leptonjs/client';
import { routes } from '../shared/routes';

const greeting = await invoke(routes.getGreeting, 'World');
// greeting is typed as string
```

| Param | Type | Description |
|---|---|---|
| `route` | `Route<I, O>` | A route definition from `@leptonjs/registry` |
| `input` | `I` | The input payload — type-checked against the route's `inputSchema` |

**Returns:** `Promise<O>` — the backend handler's return value.

**Under the hood:** `invoke` sends a JSON-RPC request via the injected `window.__lepton.invoke()` bridge, which POSTs to the IPC server's `/__ipc` endpoint with a correlation ID. The response is matched and returned.

### `listen<E>(event, callback): () => void`

Subscribe to a typed server-sent event. Returns an unsubscribe function.

```ts
import { listen } from '@leptonjs/client';
import { events } from '../shared/events';

const unsubscribe = listen(events.tick, (count) => {
  console.log('Tick:', count); // count is typed as number
});

// Later, to stop listening:
unsubscribe();
```

| Param | Type | Description |
|---|---|---|
| `event` | `TypedEvent<P>` | An event definition from `@leptonjs/registry` |
| `callback` | `(payload: P) => void` | Called each time the backend emits this event |

**Returns:** `() => void` — call this function to unsubscribe.

**Under the hood:** `listen` opens an SSE connection via `window.__lepton.listen()` and filters incoming events by name.

## Usage with React

For React apps, prefer the `useEvent` hook from [`@leptonjs/react`](../react/) — it wraps `listen` with proper `useEffect` lifecycle management:

```tsx
import { useEvent } from '@leptonjs/react';
import { events } from '../shared/events';

function Clock() {
  const tick = useEvent(events.tick, 0);
  return <p>Tick: {tick}</p>;
}
```

## Usage without React

`@leptonjs/client` is framework-agnostic. You can use `invoke` and `listen` with any frontend framework or vanilla JS:

```ts
// Vanilla JS
import { invoke, listen } from '@leptonjs/client';
import { routes } from './shared/routes';
import { events } from './shared/events';

document.getElementById('greet-btn')?.addEventListener('click', async () => {
  const name = document.getElementById('name-input') as HTMLInputElement;
  const result = await invoke(routes.getGreeting, name.value);
  document.getElementById('output')!.textContent = result;
});

listen(events.tick, (count) => {
  document.getElementById('tick')!.textContent = `Tick: ${count}`;
});
```

## Type Exports

| Type | Description |
|---|---|
| `LeptonClient` | The shape of the `window.__lepton` bridge object |

## License

MIT
