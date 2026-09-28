# Contributing to LeptonJS

Thanks for wanting to help. This guide keeps things short so you can get productive quickly.

## Before you start

- Read the [README](./README.md) for product overview and status (currently **Windows x64 beta**).
- Check [open issues](https://github.com/gihanrangana/leptonjs/issues) and [pull requests](https://github.com/gihanrangana/leptonjs/pulls) so you don’t duplicate work.
- For larger changes, open an issue first and describe the idea.

## Prerequisites

| Tool | Notes |
|------|--------|
| **Node.js** | ≥ 22.12 (CLI / OpenTUI paths may need a newer Node — see package engines) |
| **pnpm** | `11.24.0` (see `packageManager` in root `package.json`) |
| **Rust** | Stable toolchain + MSVC Build Tools (Windows) for the native addon |
| **WebView2** | Evergreen runtime on Windows |

## Repo layout

```
packages/
  core/          # app runtime (`app.start`, IPC server, lifecycle)
  native/        # JS loader for the `.node` addon
  native-win32-x64-msvc/  # platform binary package
  registry/      # typed routes / events (Zod)
  client/        # frontend IPC helpers
  react/         # React bindings
  vite/          # Vite plugin
  cli/           # `leptonjs` CLI
native/          # Rust (wry + tao) N-API addon
examples/        # sample apps (e.g. `react`, `hello`)
```

Change only what your PR needs. Prefer small, focused PRs.

## Setup

```bash
git clone https://github.com/gihanrangana/leptonjs.git
cd leptonjs
pnpm install
pnpm build
```

## Everyday commands

```bash
# Run an example
pnpm dev react

# Build everything (native + packages + CLI)
pnpm build

# Lint / format (Biome)
pnpm check
pnpm validate
pnpm format
```

After changing TypeScript in `packages/`, rebuild affected packages (or run `pnpm build:packages`) before testing examples.

After changing Rust under `native/`, run `pnpm build:native` (or full `pnpm build`).

## Linting and formatting

We use [Biome](https://biomejs.dev/) (`@biomejs/biome` 2.5.10). Config lives in [`biome.json`](./biome.json). Install the **Biome** VS Code/Cursor extension so format-on-save matches CI.

```bash
pnpm check       # lint + format check (whole repo)
pnpm validate    # lint + format check (only your changed files)
pnpm lint        # lint only
pnpm format      # rewrite files to match the formatter
```

Run `pnpm validate` before you open a pull request. GitHub also runs the same changed-file check on every PR.

`pnpm check` must still be clean if you want to be sure nothing else drifted.

### Formatter

| Rule | Value |
|------|--------|
| Indent | 4 spaces |
| Line width | 100 |
| Line endings | LF |
| Quotes | single |
| Semicolons | always |
| Trailing commas | all |
| Arrow parentheses | always |

### Linter

- Preset: Biome **recommended**
- `noExplicitAny` — **error** (do not use `any`)
- `noUnusedVariables` — **warn**

Biome does not lint Rust under `native/` or `host/`. Match nearby Rust style there.

Ignored by Biome: `dist/`, `dist-backend/`, `release/`, `native/`, `node_modules/`.

## How to contribute

### Bug fixes

1. Reproduce the issue (note OS, Node version, steps).
2. Fix with the smallest change that solves it.
3. Add or update an example path if it helps prove the fix.

### Features

1. Open an issue describing the use case.
2. Follow the existing patterns (typed IPC, `app.start`, CLI env-driven mode).
3. Keep the public API small; avoid breaking published `@leptonjs/*` APIs without discussion.

### Docs

Typos, clearer examples, and package README improvements are always welcome.

## Coding guidelines

- **TypeScript:** strict typing; avoid `any` (Biome `noExplicitAny` is an error).
- **Lint / format:** Biome — see [Linting and formatting](#linting-and-formatting). Run `pnpm validate` before you open a PR.
- **No dangling imports:** every import must resolve; don’t leave stubbed incomplete modules.
- **Match local style:** same naming, file layout, and error-handling patterns as nearby code.
- **Don’t commit secrets,** large binaries, or `node_modules`.

## Pull request checklist

- [ ] PR title clearly describes the change
- [ ] Linked issue (if any)
- [ ] `pnpm build` succeeds locally
- [ ] `pnpm validate` is clean (GitHub also runs this on the PR)
- [ ] Example still works (`pnpm dev react` or relevant target)
- [ ] Docs / README updated when behavior or public API changes

## Commit messages

Prefer short, imperative messages (AI agents: follow [AGENTS.md](./AGENTS.md)):

```text
fix(core): keep decorations when showing hidden main window
feat(cli): add --no-tui flag for CI logs
docs: clarify app.start setup for contributors
```

## Reporting bugs

Include:

1. LeptonJS / package versions  
2. OS and Node version  
3. Steps to reproduce  
4. Expected vs actual behavior  
5. Logs or stack traces (redact secrets)

## Code of conduct

Be respectful and constructive. Assume good intent. Harassment or bad-faith behavior is not welcome.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
