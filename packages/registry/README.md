# @leptonjs/registry

Zod route and event definitions for LeptonJS. Backend code imports these builders. The frontend does not need to import the resulting objects at runtime. It merges their types into `@leptonjs/client`.

## Installation

```bash
npm install @leptonjs/registry zod
```

## Routes

`defineRoute(inputSchema, outputSchema, handler)` creates a leaf. The name is empty until `defineApi` from `@leptonjs/core` walks the tree and sets `greeting.getGreeting`.

```ts
import { defineApi } from '@leptonjs/core';
import { defineRoute } from '@leptonjs/registry';
import z from 'zod';

export const getGreeting = defineRoute(
    z.string(),
    z.string(),
    async (name) => `Hello, ${name}!`,
);

export const greeting = defineApi({ getGreeting });
```

| Field | Role |
| --- | --- |
| `name` | Wire name. Assigned by `defineApi` |
| `inputSchema` | Zod schema for the request |
| `outputSchema` | Zod schema for the response |
| `handler` | `(input) => output \| Promise<output>` |

`route(name, inputSchema, outputSchema?)` and `defineRoutes` are the older flat helpers. New apps should use `defineRoute` plus `defineApi`. `outputSchema` on `route` defaults to `z.unknown()`.

`findRoute(routes, name)` returns the route with that wire name, or `undefined`.

## Events

`defineEvents` walks the tree and sets each dotted `name`.

### Push

One schema. The page does not send input. The backend calls `ipcMain.emit`.

```ts
import { defineEvent, defineEvents } from '@leptonjs/registry';
import z from 'zod';

export const events = defineEvents({
    clock: {
        tick: defineEvent(z.number()),
    },
});
```

Wire name: `clock.tick`.

### Input

Input schema, payload schema, then `(input, emit) => void | (() => void)`.

```ts
export const events = defineEvents({
    echo: {
        shout: defineEvent(z.string(), z.string(), (text, emit) => {
            emit(text.toUpperCase());
        }),
    },
});
```

Wire name: `echo.shout`. The page calls `ipc.on('echo.shout', text, cb)`. Return a function from the handler when the subscription should dispose a timer or similar. `emit` checks the payload with `payloadSchema` before it is written to SSE.

`event(name, payloadSchema)` is the older flat push helper. New apps should use `defineEvent` plus `defineEvents`.

`findEvent(events, name)` looks up a wire name.

## Types

| Type | Meaning |
| --- | --- |
| `Route<I, O>` | Named route schemas, no handler |
| `DefinedRoute<I, O>` | Route plus `handler` |
| `RouteInput<R>` / `RouteOutput<R>` | Extracted input and output |
| `TypedEvent<P, I>` | Payload `P`. Input `I` defaults to `void` for a push event |
| `EventHandler<I, P>` | `(input, emit) => void \| (() => void)` |
| `FlattenRoutes<T>` / `FlattenEvents<T>` | Dotted maps used by the client |

## License

MIT
