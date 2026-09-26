# @leptonjs/react

React hooks for LeptonJS. Subscribe to server-pushed events inside React components with a single line of code.

## Installation

```bash
npm install @leptonjs/react
```

### Peer Dependencies

| Package | Version |
|---|---|
| `react` | `≥ 18` |
| `@leptonjs/client` | same version |
| `@leptonjs/registry` | same version |

## API Reference

### `useEvent<E>(event, initialValue): P`

Subscribe to a typed LeptonJS SSE event. Returns the **latest payload** and automatically unsubscribes on unmount or when the event reference changes.

```tsx
import { useEvent } from '@leptonjs/react';
import { events } from '../shared/events';

function Clock() {
  const tick = useEvent(events.tick, 0);
  return <p>Tick: {tick}</p>;
}
```

| Param | Type | Description |
|---|---|---|
| `event` | `TypedEvent<P>` | An event definition from `@leptonjs/registry` |
| `initialValue` | `P` | The value returned before the first event arrives |

**Returns:** `P` — the latest payload, re-renders the component on every new event.

### How It Works

`useEvent` is a thin wrapper around `@leptonjs/client`'s `listen` function:

```ts
const useEvent = <E extends TypedEvent<unknown>>(event: E, initial: EventPayload<E>) => {
  const [value, setValue] = useState(initial);
  useEffect(() => listen(event, setValue), [event]);
  return value;
};
```

- A `listen` subscription is opened on mount.
- Each incoming event calls `setValue`, triggering a re-render.
- The subscription is cleaned up on unmount (or when `event` changes).

## Full Example

```tsx
// src/shared/events.ts
import { defineEvents, event } from '@leptonjs/registry';
import { z } from 'zod';

export const events = defineEvents({
  tick: event('tick', z.number()),
  status: event('status', z.object({
    online: z.boolean(),
    latency: z.number(),
  })),
});

// src/frontend/App.tsx
import { invoke } from '@leptonjs/client';
import { useEvent } from '@leptonjs/react';
import { events } from '../shared/events';
import { routes } from '../shared/routes';
import { useState } from 'react';

function App() {
  const tick = useEvent(events.tick, 0);
  const status = useEvent(events.status, { online: false, latency: 0 });

  const [name, setName] = useState('World');
  const [greeting, setGreeting] = useState('');

  const onGreet = async () => {
    setGreeting(await invoke(routes.getGreeting, name));
  };

  return (
    <main>
      <h1>LeptonJS + React</h1>
      <p>Tick: {tick}</p>
      <p>Status: {status.online ? '🟢 Online' : '🔴 Offline'} ({status.latency}ms)</p>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={onGreet}>Greet</button>
      <p>{greeting}</p>
    </main>
  );
}
```

## Calling Routes

For calling backend routes (`invoke`), import directly from `@leptonjs/client` — this package focuses solely on event subscriptions via hooks. See the [`@leptonjs/client` README](../client/) for `invoke` usage.

## License

MIT
