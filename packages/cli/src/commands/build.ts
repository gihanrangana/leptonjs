import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { readVersion } from '../banner';
import { runStep } from '../packager/steps';
import { spawnAsync } from '../packager/utils';
import { resolveAppRoot } from '../resolve-app-root';
import { resolveProject } from '../resolve-project';
import { createSession } from '../tui/session';
import type { TaskReporter } from '../tui/types';

const require = createRequire(import.meta.url);

const resolveBin = (pkgJson: string, fromDir: string, fallback: () => string): string => {
    try {
        return dirname(require.resolve(pkgJson, { paths: [fromDir] }));
    } catch {
        return dirname(fallback());
    }
};

const runLogged = async (
    reporter: TaskReporter,
    cmd: string,
    args: string[],
    cwd: string,
    failLabel: string,
): Promise<void> => {
    const result = await spawnAsync(cmd, args, { cwd });
    if (result.stdout.trim()) reporter.log(result.stdout.trimEnd());
    if (result.stderr.trim()) reporter.log(result.stderr.trimEnd());
    if (result.code !== 0) {
        throw new Error(`${failLabel} (code ${result.code})`);
    }
};

export const runBuild = async (target: string | undefined, noTui: boolean): Promise<void> => {
    const project = resolveProject(resolveAppRoot(target));
    const session = await createSession({
        mode: 'build',
        headerText: `LeptonJS v${readVersion()}  build  ${project.appName}`,
        noTui,
        onQuit: () => process.exit(0),
    });

    try {
        await runStep(session.reporter, 'Build frontend (Vite)', async () => {
            const viteDir = resolveBin('vite/package.json', project.frontendDir, () =>
                require.resolve('vite/package.json'),
            );
            await runLogged(
                session.reporter,
                process.execPath,
                [join(viteDir, 'bin', 'vite.js'), 'build'],
                project.frontendDir,
                'Vite build failed',
            );
        });

        await runStep(session.reporter, 'Build backend (esbuild)', async () => {
            let esbuildDir: string;
            try {
                esbuildDir = dirname(
                    require.resolve('esbuild/package.json', { paths: [project.appRoot] }),
                );
            } catch {
                esbuildDir = dirname(require.resolve('esbuild/package.json'));
            }

            const args = [
                join(esbuildDir, 'bin', 'esbuild'),
                project.backendEntry,
                '--bundle',
                '--platform=node',
                '--format=esm',
                `--outfile=${join(project.backendOutDir, 'main.mjs')}`,
                '--external:@leptonjs/core',
                '--define:process.env.LEPTON_DEV_URL=undefined',
                '--define:process.env.LEPTON_DEV_ORIGIN=undefined',
                '--define:process.env.LEPTON_DEV=undefined',
            ];
            if (project.backendTsconfig) args.push(`--tsconfig=${project.backendTsconfig}`);

            await runLogged(
                session.reporter,
                process.execPath,
                args,
                project.appRoot,
                'esbuild failed',
            );
        });

        await runStep(session.reporter, 'Write build manifest', () => {
            const backendJs = join(project.backendOutDir, 'main.mjs');
            mkdirSync(join(project.appRoot, '.lepton'), { recursive: true });
            writeFileSync(
                join(project.appRoot, '.lepton', 'build.json'),
                JSON.stringify(
                    {
                        assetDir: relative(project.appRoot, project.assetDir).replaceAll('\\', '/'),
                        backendEntry: relative(project.appRoot, backendJs).replaceAll('\\', '/'),
                        builtAt: new Date().toISOString(),
                    },
                    null,
                    2,
                ),
            );
        });

        session.reporter.log(`Frontend: ${project.assetDir}`);
        session.reporter.log(`Backend:  ${join(project.backendOutDir, 'main.mjs')}`);
    } finally {
        session.destroy();
    }
};
