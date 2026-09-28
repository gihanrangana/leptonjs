import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const shell = process.platform === 'win32';
const packagesDir = join(process.cwd(), 'packages');

const isOnNpm = (name, version) => {
    const viewed = spawnSync('npm', ['view', `${name}@${version}`, 'version'], {
        encoding: 'utf8',
        shell,
    });
    return viewed.status === 0 && viewed.stdout.trim() === version;
};

const unpublished = [];

for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const pkg = JSON.parse(readFileSync(join(packagesDir, entry.name, 'package.json'), 'utf8'));
    if (pkg.private || typeof pkg.name !== 'string' || typeof pkg.version !== 'string') continue;

    const id = `${pkg.name}@${pkg.version}`;
    if (isOnNpm(pkg.name, pkg.version)) {
        console.log(`skip ${id} (already on npm)`);
        continue;
    }

    console.log(`queue ${id}`);
    unpublished.push(pkg.name);
}

if (unpublished.length === 0) {
    console.log('Nothing to publish.');
    process.exit(0);
}

const args = [
    'publish',
    '-r',
    ...unpublished.flatMap((name) => ['--filter', name]),
    '--access',
    'public',
    '--no-git-checks',
];

const published = spawnSync('pnpm', args, { stdio: 'inherit', shell });
process.exit(published.status ?? 1);
