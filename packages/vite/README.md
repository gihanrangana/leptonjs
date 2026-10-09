# @leptonjs/vite

Vite plugin for LeptonJS. It starts the Node backend next to the Vite dev server and reloads that backend when watched files change.

## Installation

```bash
npm install -D @leptonjs/vite
```

Peers: `vite` ≥ 6 and `tsx` ≥ 4.

## Setup

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
});
```

Watch the backend tree. Routes and events live there, so a separate `src/shared` directory is not required.

## Options

| Option | Required | Description |
| --- | --- | --- |
| `backendEntry` | yes | Backend entry, usually `./src/backend/main.ts` |
| `watch` | no | Directories whose `.ts` / `.js` changes re-run setup without killing the process |
| `setupModule` | no | Setup module. Default is `app.ts` next to `backendEntry` |
| `env` | no | Extra environment variables for the backend process |

## What it does

1. Pins the Vite host to `127.0.0.1` so WebView2 CORS matches the IPC server.
2. Pre-bundles `@leptonjs/registry`, `@leptonjs/client`, and `@leptonjs/react`.
3. Spawns `backendEntry` with `tsx` once Vite is listening.

| Variable | Value |
| --- | --- |
| `LEPTON_DEV` | `'1'` |
| `LEPTON_DEV_URL` | `http://127.0.0.1:<port>` |
| `LEPTON_DEV_ORIGIN` | Same origin, used for CORS |
| `LEPTON_WATCH_DIRS` | Absolute watch paths, comma-separated |
| `LEPTON_SETUP_MODULE` | Resolved `app.ts`, or `setupModule` |

4. If the backend exits with code `75`, starts it again (developer-menu restart). That is not counted as a crash.
5. Restarts the backend up to 5 times if it exits with any other non-zero code.
6. Forwards stdout and stderr into the CLI TUI when `LEPTON_TUI=1`.
7. Stops the backend when Vite closes. Exit `0` still ends the whole `leptonjs dev` session.

`app.ts` must re-export `api` and `events`. The reloader imports that module, then registers whatever it exports. See the [core README](../core/README.md).

## Layout

```
my-app/
├── declarations.d.ts
├── src/
│   ├── backend/
│   │   ├── main.ts
│   │   ├── app.ts
│   │   ├── api.ts
│   │   └── events.ts
│   └── frontend/
│       └── App.tsx
└── vite.config.ts
```

## License

MIT
