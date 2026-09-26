# @leptonjs/native-win32-x64-msvc

Pre-built native binary for LeptonJS on **Windows x64** (MSVC toolchain).

## Overview

This package contains the compiled `.node` addon (`leptonjs-desktop-native.win32-x64-msvc.node`) that provides OS-native window management using the system WebView2 runtime. It is built from Rust source using [napi-rs](https://napi.rs) with [wry](https://github.com/nickersoft/wry) (WebView) and [tao](https://github.com/nickersoft/tao) (window management).

## Installation

This package is installed **automatically** as an optional dependency of `@leptonjs/native`. You do not need to install it directly.

```bash
npm install @leptonjs/native
# → automatically installs @leptonjs/native-win32-x64-msvc on Windows x64
```

## Requirements

- **Windows x64** (`os: win32`, `cpu: x64`)
- **WebView2 Evergreen Runtime** — pre-installed on Windows 10 (April 2018 update+) and Windows 11. If missing, download from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

## Provided Functions

| Function | Description |
|---|---|
| `createWindow(url, title, initScript, options, onEvent)` | Create a native window with embedded WebView |
| `showWindow(id)` | Show a hidden window |
| `closeWindow(id)` | Close a window |
| `setAppUserModelId(id)` | Set the Windows app user model ID |
| `quit()` | Shut down the native event loop |

See [`@leptonjs/native`](../native/) for full type definitions and usage documentation.

## Building from Source

From the monorepo root:

```bash
pnpm build:native
```

### Build Requirements

- Rust stable toolchain
- Node.js ≥ 22.12
- `@napi-rs/cli` (devDependency of the workspace root)

## License

MIT
