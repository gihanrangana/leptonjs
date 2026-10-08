![LeptonJS](assets/logo.svg)

Build native desktop apps with **Node.js** and **web technologies** — no bundled Chromium.

![npm version](https://img.shields.io/npm/v/@leptonjs/core?style=flat-square&color=f36f22&label=npm)![license](https://img.shields.io/github/license/gihanrangana/leptonjs?style=flat-square&color=416bb3)![node version](https://img.shields.io/badge/node-%E2%89%A5%2022.23-brightgreen?style=flat-square&logo=node.js&logoColor=white)![platform](https://img.shields.io/badge/platform-Windows%20x64-0078D4?style=flat-square&logo=windows&logoColor=white)![PRs welcome](https://img.shields.io/badge/PRs-welcome-f36f22?style=flat-square)![GitHub stars](https://img.shields.io/github/stars/gihanrangana/leptonjs?style=flat-square&color=f5a623)




LeptonJS is an experiment: a Node.js backend behind the OS webview (`wry` / `tao`), with typed routes and events. It is not production-ready. `0.1.0-beta.3` runs on Windows x64 only, the API can still change, and there is no `leptonjs create` scaffold.

Try `[examples/react](examples/react/)`. Break it. Open an issue with what failed, including your Node version and the `--no-tui` log.

WebView2 Evergreen is required.

## 🚧 Beta — Looking for Testers

LeptonJS is currently in beta and I'm looking for developers to test it
and report bugs, performance issues, and developer-experience problems.

Currently supported:

- Windows x64
- WebView2 Evergreen
- Node.js backend
- React / Vite frontend



### I especially want feedback about

- Installation
- Development experience
- Build process
- IPC API
- Application startup
- WebView behavior
- Binary size
- Memory usage
- Bugs/crashes

If you try LeptonJS, please open an issue with your feedback.

---



## How it compares


|                    | Electron     | Tauri                 | LeptonJS            |
| ------------------ | ------------ | --------------------- | ------------------- |
| Frontend           | Web          | Web                   | Web                 |
| Rendering          | Chromium     | OS WebView            | OS WebView          |
| Backend            | Node.js      | Rust                  | Node.js             |
| Native layer       | C++          | Rust                  | Rust                |
| IPC                | Electron IPC | Tauri commands/events | Typed routes/events |
| React              | ✅            | ✅                     | ✅                   |
| Node APIs          | ✅            | ❌/limited             | ✅                   |
| Chromium bundled   | ✅            | ❌                     | ❌                   |
| Small native layer | ❌            | ✅                     | ✅                   |


macOS (WKWebView) and Linux are not shipped in this beta.

---



## Quick start



### 1. Install

```bash
npm install @leptonjs/core @leptonjs/client @leptonjs/registry @leptonjs/react zod
npm install -D @leptonjs/cli @leptonjs/vite
```

Pin every `@leptonjs/*` package to the same version.

### 2. Define a route

`defineRoute` stores the schemas and the handler. `defineApi` assigns the wire name `greeting.getGreeting` and registers it.

```ts
// src/backend/handlers/greeting.ts
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

```ts
// src/backend/api.ts
import { defineApi } from '@leptonjs/core';
import { greeting } from './handlers/greeting';

export const api = defineApi({ greeting });
```



### 3. Define events

`clock.tick` is a push. The backend emits a number and the page only listens. `echo.shout` takes a string from the page and pushes a string back.

```ts
// src/backend/events.ts
import { defineEvent, defineEvents } from '@leptonjs/registry';
import z from 'zod';

export const events = defineEvents({
    clock: {
        tick: defineEvent(z.number()),
    },
    echo: {
        shout: defineEvent(z.string(), z.string(), (text, emit) => {
            emit(text.toUpperCase());
        }),
    },
});
```



### 4. Start the app

`app.ts` is the module dev reload imports. Re-export `api` and `events` from it, or a saved handler stays on the first version until you restart.

```ts
// src/backend/app.ts
import type { IpcMain, RouteMap } from '@leptonjs/core';
import { startClock } from './handlers/clock';

export { api } from './api';
export { events } from './events';

export const setup = (ipcMain: IpcMain<RouteMap>): (() => void) => {
    const stopClock = startClock(ipcMain);
    return () => {
        stopClock();
    };
};
```

```ts
// src/backend/handlers/clock.ts
import type { IpcMain, RouteMap } from '@leptonjs/core';
import { events } from '../events';

export const startClock = <R extends RouteMap>(ipcMain: IpcMain<R>): (() => void) => {
    let n = 0;
    const timer = setInterval(() => {
        n += 1;
        ipcMain.emit(events.clock.tick, n);
    }, 1000);
    return () => clearInterval(timer);
};
```

```ts
// src/backend/main.ts
import { app } from '@leptonjs/core';
import { api } from './api';
import { setup } from './app';
import { events } from './events';

void app.start({
    api,
    events,
    title: 'My App',
    setup,
});
```

You do not call `bindEvents` yourself. `app.start` registers the tree.

### 5. Type the frontend

Add a declaration file and include it from the frontend `tsconfig`. Use `import type` so the webview bundle does not pull in Node handlers.

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

```json
{
    "include": ["./src/frontend", "./declarations.d.ts"]
}
```

After this, `ipc.invoke` and `ipc.on` suggest `greeting.getGreeting`, `clock.tick`, and `echo.shout`.

### 6. Call it from React

`useEvent('clock.tick', 0)` keeps the latest tick in state. `0` is only the first render. It is not sent to the backend.

`ipc.on('clock.tick', ...)` is the same stream without React state. Return its stop function from `useEffect`.

`ipc.on('echo.shout', text, ...)` sends `text`. The callback receives the uppercase string. Stop that subscription after the result so each click does not add another listener.

```tsx
// src/frontend/App.tsx
import { ipc } from '@leptonjs/client';
import { useEvent } from '@leptonjs/react';
import { useEffect, useState } from 'react';

export function App() {
    const [name, setName] = useState('World');
    const [greeting, setGreeting] = useState('');
    const [text, setText] = useState('hello');
    const [shout, setShout] = useState('');

    const tick = useEvent('clock.tick', 0);

    useEffect(() => {
        return ipc.on('clock.tick', (n) => {
            console.log(n);
        });
    }, []);

    const onShout = () => {
        const stop = ipc.on('echo.shout', text, (result) => {
            setShout(result);
            stop();
        });
    };

    return (
        <main>
            <p>Tick: {tick}</p>
            <button
                type="button"
                onClick={async () => {
                    setGreeting(await ipc.invoke('greeting.getGreeting', name));
                }}
            >
                Greet
            </button>
            <p>{greeting}</p>
            <button type="button" onClick={onShout}>
                Shout
            </button>
            <p>{shout}</p>
        </main>
    );
}
```

`ipc.greeting.getGreeting(name)` is the same call as `ipc.invoke('greeting.getGreeting', name)`.

Passing a payload to `clock.tick` is a type error. Omitting the string on `echo.shout` is a type error.

### 7. Configure Vite

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
            watch: ['./src/backend'],
        }),
    ],
    server: { host: '127.0.0.1' },
});
```



### 8. Run

```bash
npx leptonjs dev
```

Restart `leptonjs dev` after you change `@leptonjs/core` or the preload script. The preload is injected when the window is created.

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
│  │ IPC Srv  │◄────-┼──► ipc.invoke / ipc.on     │
│  │ (HTTP +  │      │   useEvent()               │
│  │  SSE)    │      │                            │
│  └──────────┘      │                            │
│       │            │                            │
│  @leptonjs/native  │                            │
│  (Rust N-API)      │                            │
│       │            │                            │
│  wry + tao         │   OS WebView               │
│  (native windows)  │   (WebView2)               │
└────────────────────┴────────────────────────────┘
        ↕ @leptonjs/registry
          (defineRoute, defineEvent, Zod)
```

1. `@leptonjs/registry` defines route leaves (`defineRoute`) and events (`defineEvent` / `defineEvents`).
2. `@leptonjs/core` runs on Node.js. `defineApi` names the routes. `app.start({ api, events })` registers them, starts the IPC server, and opens the window.
3. `@leptonjs/client` runs in the WebView. `ipc` calls routes and subscribes to events by dotted name.
4. `@leptonjs/react` provides `useEvent(name, initial)` for push events.
5. `@leptonjs/vite` runs the Vite dev server and the Node backend together.
6. `@leptonjs/cli` provides `leptonjs dev`, `build`, `start`, and `pack`.
7. `@leptonjs/native` loads the Rust addon that creates the WebView2 window.

The page does not import handler implementations. A `declare module '@leptonjs/client'` block merges your `api` and `events` types into `ipc`.

---



## Packages


| Package                                                              | Role                                          | README                                             |
| -------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| `[@leptonjs/core](packages/core/)`                                   | `app.start`, `defineApi`, windows, IPC server | [README](packages/core/README.md)                  |
| `[@leptonjs/client](packages/client/)`                               | Frontend `ipc` (`invoke`, `on`)               | [README](packages/client/README.md)                |
| `[@leptonjs/registry](packages/registry/)`                           | `defineRoute`, `defineEvent`, Zod schemas     | [README](packages/registry/README.md)              |
| `[@leptonjs/react](packages/react/)`                                 | `useEvent(name, initial)`                     | [README](packages/react/README.md)                 |
| `[@leptonjs/vite](packages/vite/)`                                   | Vite plugin for dev                           | [README](packages/vite/README.md)                  |
| `[@leptonjs/cli](packages/cli/)`                                     | `leptonjs` CLI                                | [README](packages/cli/README.md)                   |
| `[@leptonjs/native](packages/native/)`                               | Native addon loader                           | [README](packages/native/README.md)                |
| `[@leptonjs/native-win32-x64-msvc](packages/native-win32-x64-msvc/)` | Pre-built Windows x64 binary                  | [README](packages/native-win32-x64-msvc/README.md) |


---



## Project structure

```
my-app/
├── declarations.d.ts          ← augments LeptonApp for the frontend
├── src/
│   ├── backend/
│   │   ├── main.ts            ← app.start({ api, events, setup })
│   │   ├── app.ts             ← setup, plus re-exports of api and events
│   │   ├── api.ts             ← defineApi(...)
│   │   ├── events.ts          ← defineEvents(...)
│   │   └── handlers/
│   └── frontend/
│       ├── main.tsx
│       └── App.tsx
├── vite.config.ts
├── tsconfig.app.json          ← include declarations.d.ts
├── tsconfig.backend.json
└── package.json               ← "lepton" field, or lepton.config.json
```

Routes and events live next to the backend that implements them. The frontend sees their types through `declarations.d.ts`, not through a shared runtime module.

---



## CLI

```bash
leptonjs dev [target]               # Dev mode with HMR
leptonjs build [target]             # Production build
leptonjs start [target]             # Run the production build locally
leptonjs pack [target] [flags]      # Package for distribution
```

`--no-tui` prints plain logs. Use it in CI and when a terminal is not a TTY.

### Pack flags


| Flag                   | Description                             |
| ---------------------- | --------------------------------------- |
| `--node-version <ver>` | Node.js version to bundle               |
| `--no-bytecode`        | Skip V8 bytecode compilation            |
| `--no-node-runtime`    | Don't bundle the Node.js runtime        |
| `--skip-integrity`     | Skip integrity checks                   |
| `--no-installer`       | Portable directory instead of installer |
| `--bundle-runtime`     | Bundle the Node.js runtime              |


See the `@leptonjs/cli` [README](packages/cli/README.md) for the rest.

### Configuration

`lepton.config.json`, or the `"lepton"` field in `package.json`:

```json
{
    "frontend": ".",
    "backend": "src/backend/main.ts",
    "watch": ["src/backend"],
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



## IPC

Transport is loopback HTTP on `127.0.0.1`. Routes are `POST /__ipc`. Push events are `GET /__sse`. An input event subscription is `POST /__on`, and unsubscribe is `POST /__off`. Those endpoints require the `x-lepton-token` header injected by the preload script.

### Routes

```ts
const getUser = defineRoute(
    z.object({ id: z.number() }),
    z.object({ name: z.string(), email: z.string() }),
    async ({ id }) => {
        const user = await db.findUser(id);
        return { name: user.name, email: user.email };
    },
);

export const users = defineApi({ getUser });
export const api = defineApi({ users });
```

```ts
const user = await ipc.invoke('users.getUser', { id: 42 });
```

Zod checks the input before the handler runs, and checks the handler return value before it is sent.

### Push events

`defineEvent(payloadSchema)` has no page input. Emit from the backend:

```ts
ipcMain.emit(events.clock.tick, n);
```

Listen on the page:

```ts
const tick = useEvent('clock.tick', 0);
const stop = ipc.on('clock.tick', (n) => {
    console.log(n);
});
```

`useEvent` does not send `0` to the backend. Until the first SSE message, the component shows that initial value.

### Input events

`defineEvent(inputSchema, payloadSchema, handler)` runs when the page subscribes with a payload. `handler` is `(input, emit) => void | (() => void)`. Return a function when the subscription should keep something alive. `app.start` calls that function on unsubscribe and on dev reload.

```ts
shout: defineEvent(z.string(), z.string(), (text, emit) => {
    emit(text.toUpperCase());
});
```

```ts
const stop = ipc.on('echo.shout', 'hello', (result) => {
    console.log(result); // "HELLO"
    stop();
});
```

A push event such as `clock.tick` is not in the input-event map. Posting a payload to it returns `unknown event`.

---



## Backend reload in dev

`leptonjs dev` watches the directories in `lepton.watch`. The setup module is `app.ts` beside `backendEntry`, unless you set another path.

On a saved `.ts` or `.js` file it:

1. Calls the previous `setup` dispose function.
2. Clears route handlers and event subscriptions.
3. Registers `api` and `events` exported by the fresh `app.ts` module.
4. Runs `setup` again.

If `app.ts` does not export `api` or `events`, reload keeps the objects captured at startup.

---



## Current limits

- Windows x64 and WebView2 only. No macOS or Linux binary.
- Beta API. Names and option shapes can change before 1.0.
- No `leptonjs create`. Copy `[examples/react](examples/react/)` or follow the quick start.
- No automated test suite in this repo yet.
- Frontend autocomplete depends on `declarations.d.ts` being part of the frontend program.
- Changing packages under `packages/` requires a package rebuild and a new `leptonjs dev` process before the window sees it.

---



## App dependencies

When you install from npm instead of this workspace:

```json
{
    "dependencies": {
        "@leptonjs/core": "0.1.0-beta.3",
        "@leptonjs/client": "0.1.0-beta.3",
        "@leptonjs/registry": "0.1.0-beta.3",
        "@leptonjs/react": "0.1.0-beta.3",
        "zod": "^4.4.3"
    },
    "devDependencies": {
        "@leptonjs/cli": "0.1.0-beta.3",
        "@leptonjs/vite": "0.1.0-beta.3"
    }
}
```

---



## Requirements


| Requirement  | Details                                             |
| ------------ | --------------------------------------------------- |
| **Node.js**  | ≥ 22.23                                             |
| **OS**       | Windows x64                                         |
| **WebView2** | Evergreen runtime (pre-installed on modern Windows) |
| **Rust**     | Only if you build the native addon from source      |
| **pnpm**     | Only for this monorepo                              |


---



## Example


| Example                             | Description                                                             |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `[examples/react](examples/react/)` | React + Vite app: greeting route, clock push, shout input event, splash |


From this repo:

```bash
pnpm install
pnpm build
pnpm leptonjs -- dev react
```

---



## Development

This repo is a pnpm workspace. Packages live under `packages/`.

```bash
pnpm install
pnpm build
```

`pnpm build` compiles the Rust addon, the host binary, and the TypeScript packages.

```bash
pnpm leptonjs -- dev react
pnpm leptonjs -- build react --no-tui
pnpm leptonjs -- start react --no-tui
pnpm leptonjs -- pack react --no-tui --no-installer
```

Dev IPC and the Vite origin use `127.0.0.1`, not `localhost`, so WebView2 CORS matches. The default CLI UI is the Ink TUI. Pass `--no-tui` for plain logs.

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Run `pnpm validate` on the files you changed.

---



## License

MIT — see [LICENSE](LICENSE).
