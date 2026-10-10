import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { IntegrityFileEntry, IntegrityReport, PackConfig } from './types';
import { hashFile } from './utils';

const toPosix = (p: string): string => p.replaceAll('\\', '/');

const walk = (dir: string): string[] => {
    if (!existsSync(dir)) return [];
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(p));
        else out.push(p);
    }
    return out;
};

const assertBytecodeFile = (file: string): void => {
    const buf = readFileSync(file);
    if (buf.length < 16) throw new Error('main.jsc is too small to be V8 bytecode');
    const head = buf.subarray(0, 8);
    const ascii = [...head].every((b) => b >= 32 && b < 127);
    if (ascii) throw new Error('main.jsc looks like plaintext, not V8 bytecode');
};

export const verifyIntegrity = async (config: PackConfig): Promise<IntegrityReport> => {
    const appDir = join(config.releaseDir, 'app');
    const launcher = join(appDir, 'launcher.cjs');
    const mainJsc = join(appDir, 'main.jsc');
    const mainJs = join(appDir, 'main.js');

    if (!existsSync(launcher)) throw new Error('launcher.cjs is missing from release/portable/app');

    const launcherBytes = statSync(launcher).size;
    if (launcherBytes > 1024) {
        throw new Error(`launcher.cjs is ${launcherBytes} bytes (expected < 500)`);
    }

    if (config.enableBytecode) {
        if (existsSync(mainJs))
            throw new Error('plaintext main.js was not deleted after bytecode compile');
        if (!existsSync(mainJsc)) throw new Error('main.jsc is missing');
        assertBytecodeFile(mainJsc);
    } else if (!existsSync(mainJs)) {
        throw new Error('main.js is missing');
    }

    const jsFilesFound: string[] = [];
    const tsFilesFound: string[] = [];

    for (const file of walk(appDir)) {
        const rel = toPosix(relative(appDir, file));
        if (rel.startsWith('node_modules/')) continue;
        if (file.endsWith('.ts')) tsFilesFound.push(rel);
        if (file.endsWith('.js')) jsFilesFound.push(rel);
    }

    const allowedJs = new Set(['launcher.cjs', ...(config.enableBytecode ? [] : ['main.js'])]);
    const unexpectedJs = jsFilesFound.filter((f) => !allowedJs.has(f));
    const passed = unexpectedJs.length === 0 && tsFilesFound.length === 0;

    if (!passed) {
        throw new Error(
            `Plaintext scan failed. js=${JSON.stringify(jsFilesFound)} ts=${JSON.stringify(tsFilesFound)}`,
        );
    }

    const hashTargets: string[] = [launcher];
    if (config.enableBytecode) hashTargets.push(mainJsc);
    else hashTargets.push(mainJs);

    const runtimeDir = join(config.releaseDir, 'runtime');
    hashTargets.push(...walk(runtimeDir).filter((file) => file.endsWith('.node')));

    const runtimeBin = join(
        config.releaseDir,
        'runtime',
        `${config.appName}-runtime${config.platform === 'win32' ? '.exe' : ''}`,
    );
    if (existsSync(runtimeBin)) hashTargets.push(runtimeBin);

    const indexHtml = join(config.releaseDir, 'assets', 'index.html');
    if (existsSync(indexHtml)) hashTargets.push(indexHtml);

    const files: Record<string, IntegrityFileEntry> = {};
    for (const file of hashTargets) {
        const rel = toPosix(relative(config.releaseDir, file));
        files[rel] = {
            sha256: await hashFile(file),
            bytes: statSync(file).size,
        };
    }

    const report: IntegrityReport = {
        generatedAt: new Date().toISOString(),
        version: config.version,
        platform: `${config.platform}-${config.arch}`,
        nodeVersion: config.nodeVersion,
        bytecodeEnabled: config.enableBytecode,
        files,
        plaintextScan: {
            passed,
            jsFilesFound,
            tsFilesFound,
        },
    };

    writeFileSync(
        join(config.releaseDir, 'integrity.json'),
        JSON.stringify(report, null, 4),
        'utf-8',
    );
    return report;
};
