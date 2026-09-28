import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const LINTABLE = /\.(?:ts|tsx|js|cjs|mjs|json)$/;

const gitLines = (args) => {
    try {
        return execSync(`git ${args}`, { encoding: 'utf8' })
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
    } catch {
        return [];
    }
};

const baseRef = gitLines('rev-parse --verify origin/main').length
    ? 'origin/main'
    : gitLines('rev-parse --verify main').length
      ? 'main'
      : 'HEAD';

const files = [
    ...new Set([
        ...gitLines(`diff --name-only --diff-filter=ACMR ${baseRef}`),
        ...gitLines(`diff --name-only --cached --diff-filter=ACMR ${baseRef}`),
        ...gitLines('ls-files --others --exclude-standard'),
    ]),
].filter((file) => LINTABLE.test(file) && existsSync(file));

if (files.length === 0) {
    console.log(`No lintable files changed vs ${baseRef}.`);
    process.exit(0);
}

const result = spawnSync('pnpm', ['exec', 'biome', 'check', '--no-errors-on-unmatched', ...files], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
