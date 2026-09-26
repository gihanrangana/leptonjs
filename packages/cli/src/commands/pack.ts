import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildBackend, compileBytecode, copyBytenodeRuntime } from '../packager/backend';
import { buildFrontend } from '../packager/frontend';
import { buildInstaller } from '../packager/installer';
import { verifyIntegrity } from '../packager/integrity';
import { generateLauncher } from '../packager/launcher';
import { copyMsvcCrt } from '../packager/msvc-crt';
import { copyNativeAddons } from '../packager/native-addon';
import { downloadNodeRuntime } from '../packager/node-runtime';
import { writeRuntimeManifest } from '../packager/runtime-manifest';
import { runStep } from '../packager/steps';
import type { PackConfig, PackFlags, StepResult } from '../packager/types';
import { dirSize, emptyDir, nodeBinaryName } from '../packager/utils';
import { resolveAppRoot } from '../resolve-app-root';
import { resolveProject } from '../resolve-project';
import type { TaskReporter } from '../tui/types';

const DEFAULT_NODE_VERSION = '22.18.0';

const readPackageVersion = (appRoot: string): string => {
    const pkgPath = join(appRoot, 'package.json');
    if (!existsSync(pkgPath)) return '0.0.0';
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
    return pkg.version ?? '0.0.0';
};

const formatBytes = (n: number): string => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 ** 2).toFixed(1)} MB`;
};

const printReport = (
    reporter: TaskReporter,
    config: PackConfig,
    steps: StepResult[],
    totalMs: number,
    outputSize: number,
): void => {
    reporter.log('');
    reporter.log(`Pack complete  ${config.appName} v${config.version}`);
    reporter.log(`  Output:    ${config.releaseDir}`);
    reporter.log(`  Size:      ${formatBytes(outputSize)}`);
    reporter.log(`  Duration:  ${(totalMs / 1000).toFixed(1)}s`);
    reporter.log(`  Integrity: ${config.skipIntegrity ? 'skipped' : 'passed'}`);
    for (const step of steps) {
        const mark = step.success ? '✓' : '✗';
        reporter.log(`    ${mark} ${step.name} (${(step.durationMs / 1000).toFixed(1)}s)`);
    }
};

export const runPack = async (
    reporter: TaskReporter,
    target?: string,
    flags?: PackFlags,
): Promise<void> => {
    const f: PackFlags = flags ?? {
        noBytecode: false,
        noNodeRuntime: false,
        skipIntegrity: false,
        noInstaller: false,
        bundleRuntime: false,
    };

    const appRoot = resolveAppRoot(target);
    const project = resolveProject(appRoot);

    const config: PackConfig = {
        appRoot: project.appRoot,
        appName: project.appName,
        version: readPackageVersion(project.appRoot),
        frontendDir: project.frontendDir,
        backendEntry: project.backendEntry,
        backendTsconfig: project.backendTsconfig,
        assetDir: project.assetDir,
        releaseDir: project.releaseDir,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: f.nodeVersion ?? project.config.nodeVersion ?? DEFAULT_NODE_VERSION,
        enableBytecode: !f.noBytecode,
        enableNodeRuntime: !f.noNodeRuntime,
        skipIntegrity: f.skipIntegrity,
        enableInstaller: !f.noInstaller,
        iconPath: project.iconPath,
        bundleRuntime: f.bundleRuntime,
    };

    if (config.enableBytecode && !config.enableNodeRuntime) {
        throw new Error(
            'Bytecode requires a bundled Node runtime so V8 versions match. ' +
                'Drop --no-node-runtime or pass --no-bytecode.',
        );
    }

    reporter.setTitle(`LeptonJS Pack — ${config.appName} v${config.version}`);
    reporter.log(`Platform: ${config.platform}-${config.arch}`);
    reporter.log(`Node.js:  ${config.nodeVersion}`);
    reporter.log(`Bytecode: ${config.enableBytecode ? 'enabled' : 'disabled'}`);
    reporter.log(`Output:   ${config.releaseDir}`);

    const steps: StepResult[] = [];
    const t0 = Date.now();

    try {
        steps.push(
            await runStep(reporter, 'Clean release directory', () => {
                emptyDir(config.releaseDir);
                mkdirSync(join(config.releaseDir, 'app'), { recursive: true });
            }),
        );

        steps.push(await runStep(reporter, 'Build frontend (Vite)', () => buildFrontend(config)));
        steps.push(await runStep(reporter, 'Build backend (esbuild)', () => buildBackend(config)));
        steps.push(await runStep(reporter, 'Copy native addons', () => copyNativeAddons(config)));

        if (config.enableBytecode) {
            steps.push(
                await runStep(reporter, 'Copy bytenode runtime', () => copyBytenodeRuntime(config)),
            );
        }

        if (config.enableNodeRuntime) {
            steps.push(
                await runStep(reporter, `Download Node.js ${config.nodeVersion}`, () =>
                    downloadNodeRuntime(config),
                ),
            );
        }

        if (config.platform === 'win32') {
            steps.push(await runStep(reporter, 'Copy MSVC CRT', () => copyMsvcCrt(config)));
        }

        if (config.enableBytecode) {
            const nodeBin = join(config.releaseDir, 'runtime', nodeBinaryName(config.platform));
            steps.push(
                await runStep(reporter, 'Compile V8 bytecode (bytenode)', () =>
                    compileBytecode(config, nodeBin),
                ),
            );
        }

        steps.push(
            await runStep(reporter, 'Generate launcher & exe stub', () => generateLauncher(config)),
        );

        if (!config.skipIntegrity) {
            steps.push(await runStep(reporter, 'Verify integrity', () => verifyIntegrity(config)));
        }

        steps.push(
            await runStep(reporter, 'Write runtime manifest', () => writeRuntimeManifest(config)),
        );

        if (config.enableInstaller) {
            if (config.platform !== 'win32') {
                reporter.log('Installer skipped (Windows-only)');
            } else {
                steps.push(
                    await runStep(reporter, 'Build installer', () => buildInstaller(config)),
                );
            }
        }
    } catch (e) {
        reporter.log(e instanceof Error ? e.message : String(e));
        throw e;
    }

    printReport(reporter, config, steps, Date.now() - t0, dirSize(config.releaseDir));
};
