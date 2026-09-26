# @leptonjs/vite

Vite plugin for LeptonJS desktop apps. Automatically starts and manages the Node.js backend process alongside the Vite dev server, enabling hot-reload for both frontend and backend during development.

## Installation

```bash
npm install -D @leptonjs/vite
```

### Peer Dependencies

| Package | Version |
|---|---|
| `vite` | `≥ 6` |
| `tsx` | `≥ 4` |

## Setup

Add `leptonjs()` to your Vite config:

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

## Plugin Options

### `LeptonPluginOptions`

| Option | Type | Required | Description |
|---|---|---|---|
| `backendEntry` | `string` | ✅ | Path to the backend entry file (e.g. `./src/backend/main.ts`) |
| `watch` | `string[]` | — | Directories to watch for backend HMR. When a `.ts`/`.js` file changes in these dirs, the backend `setup()` function is re-executed without restarting the process. |
| `setupModule` | `string` | — | Explicit path to the setup module. Defaults to `app.ts` next to `backendEntry`. |
| `env` | `Record<string, string>` | — | Extra environment variables passed to the backend process. |

## What the Plugin Does

1. **Binds to `127.0.0.1`** — Forces the Vite dev server host to `127.0.0.1` (required for WebView2 CORS to work). Warns and overrides if set differently.

2. **Pre-bundles LeptonJS packages** — Adds `@leptonjs/registry`, `@leptonjs/client`, and `@leptonjs/react` to Vite's `optimizeDeps.include` for faster dev startup.

3. **Spawns the backend** — When the Vite HTTP server starts listening, the plugin spawns a child process running your `backendEntry` via `tsx`. The backend receives these environment variables:

   | Variable | Value |
   |---|---|
   | `LEPTON_DEV` | `'1'` |
   | `LEPTON_DEV_URL` | `http://127.0.0.1:<port>` |
   | `LEPTON_DEV_ORIGIN` | Same as above (for CORS) |
   | `LEPTON_WATCH_DIRS` | Comma-separated absolute paths from `watch` |
   | `LEPTON_SETUP_MODULE` | Resolved path to the setup module |

4. **Auto-restarts on crash** — If the backend process exits with a non-zero code, the plugin restarts it (up to 5 times) with a 300ms debounce.

5. **Forwards logs** — When running in TUI mode (`LEPTON_TUI=1`), backend stdout/stderr are forwarded as structured messages to the CLI's terminal UI.

6. **Clean shutdown** — When the Vite server closes or the process exits, the backend is killed gracefully.

## Full Example

```
my-app/
├── src/
│   ├── backend/
│   │   ├── main.ts         ← backendEntry
│   │   └── app.ts          ← setup module (auto-detected)
│   ├── shared/
│   │   ├── routes.ts
│   │   └── events.ts
│   └── frontend/
│       ├── main.tsx
│       └── App.tsx
├── vite.config.ts
└── package.json
```

```ts
// vite.config.ts
import path from 'node:path';
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
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@': path.resolve(__dirname, 'src/frontend'),
    },
  },
  server: { host: '127.0.0.1' },
});
```

## License

MIT
