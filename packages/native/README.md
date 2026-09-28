# @leptonjs/native

Native addon loader for LeptonJS. This package locates and loads the platform-specific compiled `.node` binary that provides OS-native window management (powered by [wry](https://github.com/nickersoft/wry) + [tao](https://github.com/nickersoft/tao) via [napi-rs](https://napi.rs)).

## Installation

```bash
npm install @leptonjs/native
```

The correct platform binary is installed automatically via optional dependencies:

| Platform | Package |
|---|---|
| Windows x64 | `@leptonjs/native-win32-x64-msvc` |

> **Beta notice:** Only Windows x64 is supported in this release. macOS and Linux binaries are not yet available.

## How It Works

`@leptonjs/native` exports a singleton `native` object that is the resolved native addon. It searches for the `.node` binary in this order:

1. **`LEPTON_NATIVE_DIR` env var** — if set, looks for the binary here first.
2. **Platform package** — resolves `@leptonjs/native-win32-x64-msvc` (or the appropriate package for the current platform).
3. **Monorepo workspace** — if running inside the LeptonJS workspace, checks `dist/nodes/`.

## API

> ⚠️ **This is a low-level API.** Most apps should use `@leptonjs/core` which wraps these functions in a higher-level `app` object.

### `native.createWindow(url, title, initScript, options, onEvent): number`

Create a native OS window with an embedded WebView.

| Param | Type | Description |
|---|---|---|
| `url` | `string` | URL to load in the WebView |
| `title` | `string` | Window title |
| `initScript` | `string \| null` | JavaScript to inject before the page loads (preload) |
| `options` | `NativeWindowOptions` | Window configuration |
| `onEvent` | `WindowEventListener` | Callback for window lifecycle events |

**Returns:** `number` — the window ID.

### `native.showWindow(id)`

Show a hidden window.

### `native.closeWindow(id)`

Programmatically close a window.

### `native.setAppUserModelId(id)`

Set the Windows app user model ID (affects taskbar grouping).

### `native.quit()`

Shut down the native event loop.

## Types

### `NativeWindowOptions`

```ts
interface NativeWindowOptions {
  visible: boolean;
  decorations: boolean;
  center: boolean;
  width?: number;
  height?: number;
  backgroundColor?: [number, number, number, number]; // RGBA
}
```

### `WindowEvent`

```ts
interface WindowEvent {
  id: number;
  kind: WindowEventKind;
  message?: string;
}
```

### `WindowEventKind`

```ts
enum WindowEventKind {
  Created = 0,
  Closed  = 1,
  Error   = 2,
}
```

## Building from Source

From the monorepo root:

```bash
pnpm build:native
```

This runs `napi build` against the Rust source in `native/` and outputs the `.node` binary to `packages/native-win32-x64-msvc/`.

### Requirements

- **Rust** toolchain (stable)
- **Node.js ≥ 22.23**
- **Windows x64** with WebView2 Evergreen runtime

## License

MIT
