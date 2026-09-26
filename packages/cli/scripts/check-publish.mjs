import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = dirname(fileURLToPath(import.meta.url));
const host = join(pkg, '..', 'host', 'bin', 'lepton-host.exe');

if (!existsSync(host)) {
    console.error('Missing packages/cli/host/bin/lepton-host.exe');
    console.error('From the repo root run: pnpm build:host');
    process.exit(1);
}
