# @leptonjs/registry

Shared route and event definitions for LeptonJS. This package is the **single source of truth** for your app's IPC contract — import it from both your backend (`@leptonjs/core`) and your frontend (`@leptonjs/client`, `@leptonjs/react`) so types and runtime validation stay in sync.

## Installation

```bash
npm install @leptonjs/registry zod
```

> `zod` is a required peer — every route and event schema is a Zod type.

## Core Concepts

### Routes (Request / Response)

A **route** models a typed RPC call from the renderer to the Node.js backend. Each route has:

| Field | Description |
|---|---|
| `name` | Wire name (string sent over IPC) |
| `inputSchema` | Zod schema that validates the request payload |
| `outputSchema` | Zod schema that describes the response type |

```ts
import { route, defineRoutes } from '@leptonjs/registry';
import { z } from 'zod';

// Define a single route
const getGreeting = route('getGreeting', z.string(), z.string());

// Group routes into a map
export const routes = defineRoutes({
  getGreeting,
  getUser: route('getUser', z.object({ id: z.number() }), z.object({
    name: z.string(),
    email: z.string(),
  })),
});
```

### Events (Server → Client push)

An **event** models a typed push from the backend to all connected renderers (delivered via SSE). Each event has:

| Field | Description |
|---|---|
| `name` | Wire name (string sent over SSE) |
| `payloadSchema` | Zod schema that validates the payload |

```ts
import { event, defineEvents } from '@leptonjs/registry';
import { z } from 'zod';

export const events = defineEvents({
  tick:       event('tick', z.number()),
  userJoined: event('userJoined', z.object({ name: z.string() })),
});
```

## API Reference

### `route<I, O>(name, inputSchema, outputSchema?)`

Create a typed route definition.

| Param | Type | Description |
|---|---|---|
| `name` | `string` | Unique wire name |
| `inputSchema` | `ZodType<I>` | Validates the caller's input |
| `outputSchema` | `ZodType<O>` | *(optional)* Describes the return type — defaults to `z.unknown()` |

**Returns:** `Route<I, O>`

### `defineRoutes<R>(routes)`

Identity helper that narrows the type of a route map. Pass your routes object and get full type inference back.

```ts
const routes = defineRoutes({ getGreeting, getUser });
// typeof routes is { getGreeting: Route<string, string>; getUser: Route<...>; }
```

### `findRoute<R>(routes, name)`

Look up a route by its wire `name` at runtime. Returns `undefined` if not found.

```ts
const match = findRoute(routes, 'getGreeting'); // Route<string, string> | undefined
```

### `event<P>(name, payloadSchema)`

Create a typed event definition.

| Param | Type | Description |
|---|---|---|
| `name` | `string` | Unique wire name |
| `payloadSchema` | `ZodType<P>` | Validates the event payload |

**Returns:** `TypedEvent<P>`

### `defineEvents<E>(events)`

Identity helper that narrows the type of an event map — same idea as `defineRoutes`.

### `findEvent<E>(events, name)`

Look up an event by its wire `name` at runtime.

## Type Exports

| Type | Description |
|---|---|
| `Route<I, O>` | A single typed IPC route |
| `RouteMap` | `Record<string, Route<unknown, unknown>>` |
| `RouteInput<R>` | Extract the input type from a route |
| `RouteOutput<R>` | Extract the output type from a route |
| `Handler<R>` | Backend handler signature: `(input: I) => O \| Promise<O>` |
| `TypedEvent<P>` | A single typed event |
| `EventMap` | `Record<string, TypedEvent<unknown>>` |
| `EventPayload<E>` | Extract the payload type from an event |
| `Emitter<E>` | `(payload: P) => void` |

## Recommended Project Structure

Place your routes and events in a `shared/` directory so both backend and frontend can import them:

```
src/
├── shared/
│   ├── routes.ts    ← defineRoutes(...)
│   ├── events.ts    ← defineEvents(...)
│   └── types.ts     ← plain DTOs (no zod, no Node/DOM APIs)
├── backend/
│   └── ...
└── frontend/
    └── ...
```

## License

MIT
