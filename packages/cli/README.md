# @leptonjs/cli

Command-line tool for LeptonJS desktop apps. Provides the `leptonjs` binary with commands to develop, build, run, and package your app for distribution.

## Installation

```bash
npm install -D @leptonjs/cli
```

This adds the `leptonjs` binary to your project.

## Commands

### `leptonjs dev [target]`

Start the app in **development mode** with hot-reload for both frontend and backend.

```bash
leptonjs dev react          # start the "react" example/target
leptonjs dev                # auto-detect the current project
leptonjs dev --no-tui       # use plain logs instead of the interactive TUI
```

What happens:
1. Starts the Vite dev server (frontend HMR).
2. Spawns the Node.js backend via `tsx` with file watching.
3. Opens the native WebView window pointing at `http://127.0.0.1:<port>`.
4. Backend `setup()` function is re-executed on file changes without restarting the process.

### `leptonjs build [target]`

Build the frontend and backend for **production**.

```bash
leptonjs build react
leptonjs build --no-tui
```

What happens:
1. Builds the frontend with Vite (`vite build`).
2. Compiles the backend TypeScript with `esbuild`.
3. Outputs production-ready files to the configured output directories.

### `leptonjs start [target]`

Run the **production build** locally (no HMR, no dev server).

```bash
leptonjs start react
leptonjs start --no-tui
```

### `leptonjs pack [target] [flags]`

Package the app into a distributable binary (alias: `leptonjs release`).

```bash
leptonjs pack react
leptonjs pack react --no-installer
leptonjs pack react --no-tui --no-installer
```

#### Pack Flags

| Flag | Description |
|---|---|
| `--node-version <ver>` | Node.js version to bundle (default: current) |
| `--no-bytecode` | Skip V8 bytecode compilation of backend code |
| `--no-node-runtime` | Don't bundle the Node.js runtime |
| `--skip-integrity` | Skip integrity checks |
| `--no-installer` | Build a portable directory instead of an installer |
| `--bundle-runtime` | Bundle the Node.js runtime into the output |

### Global Flags

| Flag | Description |
|---|---|
| `--no-tui` | Disable the interactive Ink TUI; use plain `ora`/console logs (useful for CI, pipes, non-TTY environments) |

## Project Configuration

The CLI looks for configuration in two places (first wins):

### 1. `lepton.config.json`

```json
{
  "frontend": ".",
  "backend": "src/backend/main.ts",
  "watch": ["src/backend", "src/shared"],
  "port": 5173,
  "backendTsconfig": "tsconfig.backend.json"
}
```

### 2. `package.json` → `"lepton"` field

```json
{
  "name": "my-app",
  "lepton": {
    "frontend": ".",
    "backend": "src/backend/main.ts",
    "watch": ["src/backend", "src/shared"],
    "port": 5173,
    "backendTsconfig": "tsconfig.backend.json"
  }
}
```

### Configuration Options

| Field | Type | Description |
|---|---|---|
| `frontend` | `string` | Path to the frontend root (contains `vite.config.ts`) |
| `backend` | `string` | Path to the backend entry file |
| `watch` | `string[]` | Directories to watch for backend HMR |
| `port` | `number` | Vite dev server port |
| `backendTsconfig` | `string` | Path to the backend TypeScript config |
| `backendOutDir` | `string` | Backend build output directory |
| `assetDir` | `string` | Static asset directory for production |
| `releaseDir` | `string` | Directory for packaged output |
| `appName` | `string` | Application name for the packaged binary |
| `nodeVersion` | `string` | Node.js version to bundle |
| `icon` | `string` | Path to the app icon |
| `splash` | `SplashOptions` | Splash screen configuration |

### Splash Options

| Field | Type | Description |
|---|---|---|
| `image` | `string` | Path to the splash image |
| `backgroundColor` | `string` | Hex background colour |
| `width` | `number` | Splash window width |
| `height` | `number` | Splash window height |
| `minDurationMs` | `number` | Minimum splash display time (ms) |

## Terminal UI

By default, the CLI renders an interactive terminal UI built with [Ink](https://github.com/vadimdemedes/ink). This provides a split-view of frontend and backend logs with coloured output. Pass `--no-tui` to fall back to plain sequential logs (required for CI/CD pipelines).

## License

MIT
