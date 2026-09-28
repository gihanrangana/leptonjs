# Agent instructions

This file is for **any** coding agent (Cursor, Copilot, Codex, Claude Code, Windsurf, Aider, and others). Humans should start with [CONTRIBUTING.md](./CONTRIBUTING.md).

## Commit messages

When you create a git commit, the message **must** match this template (same as CONTRIBUTING.md):

```text
fix(core): keep decorations when showing hidden main window
feat(cli): add --no-tui flag for CI logs
docs: clarify app.start setup for contributors
```

- Format: `type(scope): subject` or `type: subject` when no package/area fits
- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `style`
- Scopes: `core`, `cli`, `native`, `registry`, `client`, `react`, `vite`, or omit
- Subject: lowercase, imperative, no trailing period, one line
- Do not wrap the subject in quotes or add `!` / footers unless the user asks

```markdown
<!-- ❌ BAD -->
Updated contributing and added a GitHub workflow for linting.

<!-- ✅ GOOD -->
docs: add Biome lint rules to the contributing guide
```

## Before a pull request

Run `pnpm validate` (lints files changed vs `main`). GitHub runs the same idea on every PR.

## Code

- TypeScript: no `any`. Do not leave dangling imports or incomplete modules.
- Format and lint with Biome (`biome.json`): 4 spaces, line width 100, LF, single quotes, semicolons always.
- Do not commit secrets, `node_modules`, or large binaries.
