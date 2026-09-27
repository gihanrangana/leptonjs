<p align="center">
  <a href="https://github.com/gihanrangana/leptonjs">
    <img src="assets/logo.svg" alt="LeptonJS" width="420" />
  </a>
</p>

<p align="center">
  Build native desktop apps with <strong>Node.js</strong> and <strong>web technologies</strong> — no bundled Chromium.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@leptonjs/core"><img src="https://img.shields.io/npm/v/@leptonjs/core?style=flat-square&color=f36f22&label=npm" alt="npm version" /></a>
  <a href="https://github.com/gihanrangana/leptonjs/blob/main/LICENSE"><img src="https://img.shields.io/github/license/gihanrangana/leptonjs?style=flat-square&color=416bb3" alt="license" /></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A5%2022.12-brightgreen?style=flat-square&logo=node.js&logoColor=white" alt="node version" />
  <img src="https://img.shields.io/badge/platform-Windows%20x64-0078D4?style=flat-square&logo=windows&logoColor=white" alt="platform" />
  <a href="https://github.com/gihanrangana/leptonjs/pulls"><img src="https://img.shields.io/badge/PRs-welcome-f36f22?style=flat-square" alt="PRs welcome" /></a>
  <a href="https://github.com/gihanrangana/leptonjs/stargazers"><img src="https://img.shields.io/github/stars/gihanrangana/leptonjs?style=flat-square&color=f5a623" alt="GitHub stars" /></a>
</p>

<br />

LeptonJS pairs a full Node.js backend with the OS-native WebView (`wry` / `tao`), giving you Electron-like DX at a fraction of the binary size. Define typed IPC routes with Zod, call them from your React (or vanilla JS) frontend, and ship production binaries with a single CLI command.

> **Status:** `0.1.0-beta.2` — Windows x64 only. API may change. WebView2 Evergreen is required.

---

## Why LeptonJS?


|                      | LeptonJS                              | Electron                         |
| -------------------- | ------------------------------------- | -------------------------------- |
| **Rendering engine** | OS WebView (WebView2 / WKWebView)     | Bundled Chromium                 |
| **Binary size**      | ~2 MB native addon                    | ~150 MB+                         |
| **Backend**          | Full Node.js                          | Full Node.js                     |
| **IPC**              | Typed routes + events (Zod validated) | Manual `ipcMain` / `ipcRenderer` |
| **Frontend**         | Any framework (React, Vue, vanilla)   | Any framework                    |


---



## Quick Start



### 1. Install dependencies

```bash
npm install @leptonjs/core @leptonjs/client @leptonjs/registry @leptonjs/react
npm install -D @leptonjs/cli @leptonjs/vite
```



### 2. Define your IPC contract

```ts
// src/shared/routes.ts
import { defineRoutes, route } from '@leptonjs/registry';
import { z } from 'zod';

export const routes = defineRoutes({
  getGreeting: route('getGreeting', z.string(), z.string()),
});
```

```ts
// src/shared/events.ts
import { defineEvents, event } from '@leptonjs/registry';
import { z } from 'zod';

export const events = defineEvents({
  tick: event('tick', z.number()),
});
```



### 3. Write your backend

```ts
// src/backend/main.ts
import { app } from '@leptonjs/core';
import { routes } from '../shared/routes';
import { events } from '../shared/events';

void app.start({
  routes,
  title: 'My App',
  setup(ipcMain) {
    ipcMain.handle(routes.getGreeting, async (name) => {
      return `Hello, ${name}!`;
    });

    let n = 0;
    const interval = setInterval(() => {
      ipcMain.emit(events.tick, ++n);
    }, 1000);

    return () => clearInterval(interval);
  },
});
```



### 4. Build your frontend

```tsx
// src/frontend/App.tsx
import { invoke } from '@leptonjs/client';
import { useEvent } from '@leptonjs/react';
import { routes } from '../shared/routes';
import { events } from '../shared/events';
import { useState } from 'react';

function App() {
  const tick = useEvent(events.tick, 0);
  const [name, setName] = useState('World');
  const [greeting, setGreeting] = useState('');

  return (
    <main>
      <h1>My Desktop App</h1>
      <p>Tick: {tick}</p>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={async () => setGreeting(await invoke(routes.getGreeting, name))}>
        Greet
      </button>
      <p>{greeting}</p>
    </main>
  );
}
```



### 5. Configure Vite

```ts
// vite.config.ts
import { leptonjs } from '@leptonjs/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    leptonjs({
      backendEntry: './src/backend/main.ts',
      watch: ['./src/backend', './src/shared'],
    }),
  ],
});
```



### 6. Run

```bash
npx leptonjs dev
```

---



## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Your App Code                  │
├────────────────────┬────────────────────────────┤
│  Backend (Node.js) │   Frontend (WebView)       │
│                    │                            │
│  @leptonjs/core    │   @leptonjs/client         │
│  ┌──────────┐      │   @leptonjs/react          │
│  │ IPC Srv  │◄────-┼──► invoke() / listen()     │
│  │ (HTTP +  │      │   useEvent()               │
│  │  SSE)    │      │                            │
│  └──────────┘      │                            │
│       │            │                            │
│  @leptonjs/native  │                            │
│  (Rust N-API)      │                            │
│       │            │                            │
│  wry + tao         │   OS WebView               │
│  (native windows)  │   (WebView2 / WKWebView)   │
└────────────────────┴────────────────────────────┘
        ↕ Shared: @leptonjs/registry
          (routes, events, Zod schemas)
```

1. `@leptonjs/registry` defines the typed IPC contract (routes + events) shared between backend and frontend.
2. `@leptonjs/core` runs on Node.js — manages the app lifecycle, starts the IPC server, and controls native windows.
3. `@leptonjs/client` runs in the WebView — calls backend routes and subscribes to events.
4. `@leptonjs/react` provides React hooks (`useEvent`) for declarative event subscriptions.
5. `@leptonjs/vite` orchestrates the dev experience — runs the Vite dev server and the Node.js backend together.
6. `@leptonjs/cli` provides the `leptonjs` command for dev, build, start, and pack workflows.
7. `@leptonjs/native` loads the platform-specific Rust addon that creates native windows with embedded WebViews.

---



## Packages


| Package                                                              | Role                                                   | README                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| `[@leptonjs/core](packages/core/)`                                   | Node.js runtime — `app`, IPC server, window management | [README](packages/core/README.md)                  |
| `[@leptonjs/client](packages/client/)`                               | Renderer-side `invoke()` and `listen()`                | [README](packages/client/README.md)                |
| `[@leptonjs/registry](packages/registry/)`                           | Shared `route()`, `event()`, Zod schemas, and types    | [README](packages/registry/README.md)              |
| `[@leptonjs/react](packages/react/)`                                 | React hook `useEvent()`                                | [README](packages/react/README.md)                 |
| `[@leptonjs/vite](packages/vite/)`                                   | Vite plugin — dev server + backend orchestration       | [README](packages/vite/README.md)                  |
| `[@leptonjs/cli](packages/cli/)`                                     | `leptonjs` CLI — `dev` / `build` / `start` / `pack`    | [README](packages/cli/README.md)                   |
| `[@leptonjs/native](packages/native/)`                               | Native addon loader (platform resolution)              | [README](packages/native/README.md)                |
| `[@leptonjs/native-win32-x64-msvc](packages/native-win32-x64-msvc/)` | Pre-built Windows x64 binary                           | [README](packages/native-win32-x64-msvc/README.md) |


---



## Project Structure

A typical LeptonJS app follows this layout:

```
my-app/
├── src/
│   ├── shared/                     ← IPC contract (imported by both sides)
│   │   ├── routes.ts               ← defineRoutes(...)
│   │   ├── events.ts               ← defineEvents(...)
│   │   └── types.ts                ← plain DTOs
│   ├── backend/
│   │   ├── main.ts                 ← app.start({ ... })
│   │   ├── app.ts                  ← setup function (HMR-reloaded in dev)
│   │   └── handlers/               ← route handler implementations
│   └── frontend/
│       ├── main.tsx                ← React entry point
│       ├── App.tsx                 ← root component
│       └── ...
├── vite.config.ts
├── tsconfig.json
├── tsconfig.backend.json
├── package.json                    ← or lepton.config.json
└── index.html
```



### Why `shared/`?

The `shared/` directory contains route and event definitions that are imported by **both** the backend and frontend. Since these are just Zod schemas and type definitions (no Node.js or DOM APIs), they're safe to use everywhere. This gives you:

- **Type-safe IPC** — the compiler catches mismatches between `invoke(routes.getGreeting, ...)` and `ipcMain.handle(routes.getGreeting, ...)`.
- **Runtime validation** — Zod validates inputs on the backend, so malformed payloads are rejected before they reach your handler.

---



## CLI Reference

```bash
leptonjs dev [target]               # Dev mode with HMR
leptonjs build [target]             # Production build
leptonjs start [target]             # Run production build locally
leptonjs pack [target] [flags]      # Package for distribution
```

All commands accept `--no-tui` to disable the interactive terminal UI (for CI/CD).

### Pack Flags


| Flag                   | Description                             |
| ---------------------- | --------------------------------------- |
| `--node-version <ver>` | Node.js version to bundle               |
| `--no-bytecode`        | Skip V8 bytecode compilation            |
| `--no-node-runtime`    | Don't bundle the Node.js runtime        |
| `--skip-integrity`     | Skip integrity checks                   |
| `--no-installer`       | Portable directory instead of installer |
| `--bundle-runtime`     | Bundle the Node.js runtime              |


See the full `@leptonjs/cli` [README](packages/cli/README.md) for details.

### Configuration

The CLI reads config from `lepton.config.json` or the `"lepton"` field in `package.json`:

```json
{
  "frontend": ".",
  "backend": "src/backend/main.ts",
  "watch": ["src/backend", "src/shared"],
  "port": 5173,
  "backendTsconfig": "tsconfig.backend.json",
  "appName": "My App",
  "icon": "src/assets/icon.ico",
  "splash": {
    "image": "src/assets/splash.png",
    "backgroundColor": "#0f1419",
    "width": 520,
    "height": 360,
    "minDurationMs": 2000
  }
}
```

---



## IPC in Depth



### Routes (Request / Response)

Routes model typed RPC calls from the renderer to the backend.

**Define** (shared):

```ts
const getUser = route('getUser',
  z.object({ id: z.number() }),                    // input
  z.object({ name: z.string(), email: z.string() }) // output
);
```

**Handle** (backend):

```ts
ipcMain.handle(routes.getUser, async ({ id }) => {
  const user = await db.findUser(id);
  return { name: user.name, email: user.email };
});
```

**Call** (frontend):

```ts
const user = await invoke(routes.getUser, { id: 42 });
// user is typed as { name: string; email: string }
```



### Events (Server → Client push)

Events model typed pushes from the backend to all connected renderers via SSE.

**Define** (shared):

```ts
const progress = event('progress', z.object({
  percent: z.number(),
  message: z.string(),
}));
```

**Emit** (backend):

```ts
ipcMain.emit(events.progress, { percent: 75, message: 'Almost done...' });
```

**Listen** (frontend — vanilla):

```ts
const unsub = listen(events.progress, ({ percent, message }) => {
  console.log(`${percent}%: ${message}`);
});
```

**Subscribe** (frontend — React):

```tsx
const progress = useEvent(events.progress, { percent: 0, message: '' });
```

---



## Backend HMR

During `leptonjs dev`, the backend supports **hot module replacement**:

1. You export a `setup(ipcMain)` function from your setup module (default: `app.ts` next to your `backendEntry`).
2. The `setup` function returns an optional **dispose** callback.
3. When you edit a `.ts`/`.js` file in a watched directory, LeptonJS:
  - Calls the previous `dispose()` to clean up (clear intervals, close connections, etc.)
  - Clears all route handlers.
  - Re-imports and re-runs `setup()` with a fresh `ipcMain`.

```ts
// src/backend/app.ts
export const setup = (ipcMain: IpcMain<typeof routes>) => {
  ipcMain.handle(routes.getGreeting, async (name) => `Hello, ${name}!`);

  const interval = setInterval(() => { /* ... */ }, 1000);

  // Cleanup on HMR reload:
  return () => clearInterval(interval);
};
```

---



## App Dependencies

When consuming published packages from npm (not workspace links):

```json
{
  "dependencies": {
    "@leptonjs/core": "0.1.0-beta.2",
    "@leptonjs/client": "0.1.0-beta.2",
    "@leptonjs/registry": "0.1.0-beta.2",
    "@leptonjs/react": "0.1.0-beta.2"
  },
  "devDependencies": {
    "@leptonjs/cli": "0.1.0-beta.2",
    "@leptonjs/vite": "0.1.0-beta.2"
  }
}
```

> **Pin the same version on every** `@leptonjs/`* **package** to avoid mismatches.

---



## Requirements


| Requirement  | Details                                             |
| ------------ | --------------------------------------------------- |
| **Node.js**  | ≥ 22.12                                             |
| **OS**       | Windows x64 (beta)                                  |
| **WebView2** | Evergreen runtime (pre-installed on modern Windows) |
| **Rust**     | Required only to build native addon from source     |
| **pnpm**     | Required only for monorepo development              |


---



## Examples


| Example                             | Description                                                             |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `[examples/hello](examples/hello/)` | Minimal hello-world with typed IPC, events, and multi-window            |
| `[examples/react](examples/react/)` | Full React + Vite app with backend HMR, shared types, and splash screen |


---



## Development (Contributing)

This repo is a pnpm workspace. All packages live under `packages/`.

### Build Everything

```bash
pnpm install
pnpm build
```

This runs three steps:

1. `build:native` — Compiles Rust → `.node` addon
2. `build:host` — Builds the native host binary
3. `build:packages` — Compiles all TypeScript packages



### Run Examples

```bash
# Dev mode (HMR)
pnpm leptonjs -- dev react

# Production build
pnpm leptonjs -- build react --no-tui

# Run production build
pnpm leptonjs -- start react --no-tui

# Package for distribution
pnpm leptonjs -- pack react --no-tui --no-installer
```



### Notes

- Dev IPC and the Vite origin use `127.0.0.1`, not `localhost`, so CORS matches WebView2.
- The default CLI UI is the [Ink](https://github.com/vadimdemedes/ink) TUI (requires TTY). Pass `--no-tui` for plain logs in CI/pipes.

---



## License

MIT — see [LICENSE](LICENSE).
