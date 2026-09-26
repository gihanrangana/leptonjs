import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readVersion } from '../banner';
import { killProcessTree } from '../helpers';
import { resolveAppRoot } from '../resolve-app-root';
import { resolveProject } from '../resolve-project';
import { createSession } from '../tui/session';
import type { Session } from '../tui/types';

const pipeLines = (stream: NodeJS.ReadableStream | null, onLine: (line: string) => void): void => {
    if (!stream) return;
    let buf = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => {
        buf += chunk;
        const parts = buf.split(/\r?\n/);
        buf = parts.pop() ?? '';
        for (const part of parts) onLine(part);
    });
    stream.on('end', () => {
        if (buf.length > 0) onLine(buf);
    });
};

export const runStart = async (target: string | undefined, noTui: boolean): Promise<void> => {
    const project = resolveProject(resolveAppRoot(target));
    const manifestPath = join(project.appRoot, '.lepton', 'build.json');

    if (!existsSync(manifestPath)) {
        throw new Error(`Build manifest not found: ${manifestPath}\nRun "leptonjs build" first.`);
    }

    let manifest: { assetDir?: string; backendEntry?: string };
    try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
            assetDir?: string;
            backendEntry?: string;
        };
    } catch (e) {
        throw new Error(`Failed to read build manifest: ${(e as Error).message}`);
    }

    const backendEntry = join(project.appRoot, manifest.backendEntry ?? 'dist-backend/main.mjs');
    const assetDir = join(project.appRoot, manifest.assetDir ?? 'dist');

    if (!existsSync(backendEntry)) {
        throw new Error(`Built backend not found: ${backendEntry}\nRun "leptonjs build" first.`);
    }
    if (!existsSync(assetDir)) {
        throw new Error(`Built frontend not found: ${assetDir}\nRun "leptonjs build" first.`);
    }

    let session: Session | null = null;
    const child = spawn(process.execPath, [backendEntry], {
        cwd: project.appRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
            LEPTON_ASSET_DIR: assetDir,
            ...(project.splash ? { LEPTON_SPLASH: JSON.stringify(project.splash) } : {}),
        },
    });

    const shutdown = (code = 0): void => {
        killProcessTree(child.pid);
        try {
            session?.destroy();
        } catch {
            /* already destroyed */
        }
        process.exit(code);
    };

    process.on('SIGINT', () => shutdown(0));
    process.on('SIGTERM', () => shutdown(0));

    session = await createSession({
        mode: 'start',
        headerText: `LeptonJS v${readVersion()}  start  ${project.appName}`,
        noTui,
        onQuit: () => shutdown(0),
    });

    session.appendLog(`[lepton] backend=${backendEntry}`);
    session.appendLog(`[lepton] assets=${assetDir}`);

    pipeLines(child.stdout, session.appendLog);
    pipeLines(child.stderr, session.appendLog);

    child.on('exit', (code) => {
        session?.appendLog(`[lepton] exited with code ${code ?? 0}`);
        shutdown(code ?? 0);
    });
};
