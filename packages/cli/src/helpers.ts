import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type z from 'zod';
import { leptonConfigSchema } from './config-schema';
import type { SpawnedDev } from './spawn';
import type { LeptonProjectConfig, ResolvedLeptonProject } from './types';

const require = createRequire(import.meta.url);

const pipelines = (stream: NodeJS.ReadableStream | null, onLine: (line: string) => void): void => {
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

export const resolveTsx = (projectDir: string): string => {
    const projectReq = createRequire(join(projectDir, 'package.json'));

    try {
        const tsxPkg = projectReq.resolve('tsx/package.json');
        return join(dirname(tsxPkg), 'dist', 'cli.mjs');
    } catch {
        throw new Error(
            'LeptonJS dev requires "tsx". Install it in your project:\n' +
                '  pnpm add -D tsx\n' +
                'Or install globally:\n' +
                '  pnpm add -g tsx',
        );
    }
};

export const killProcessTree = (pid: number | undefined): void => {
    if (pid === undefined) return;
    if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
        return;
    }
    try {
        process.kill(pid, 'SIGTERM');
    } catch {
        /* already gone */
    }
};

export const spawnDevProcesses = (
    project: ResolvedLeptonProject,
    handlers: {
        onBackendLine: (line: string) => void;
        onFrontendLine: (line: string) => void;
    },
): SpawnedDev => {
    const vitePkg = require.resolve('vite/package.json', { paths: [project.frontendDir] });
    const viteBin = join(dirname(vitePkg), 'bin', 'vite.js');

    const vite = spawn(
        process.execPath,
        [viteBin, '--port', String(project.port), '--strictPort'],
        {
            cwd: project.frontendDir,
            stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
            env: {
                ...process.env,
                LEPTON_TUI: '1',
                FORCE_COLOR: '0',
                ...(project.splash ? { LEPTON_SPLASH: JSON.stringify(project.splash) } : {}),
            },
        },
    );

    pipelines(vite.stdout, handlers.onFrontendLine);
    pipelines(vite.stderr, handlers.onFrontendLine);

    vite.on('message', (msg: { type?: string; source?: string; text?: string }) => {
        if (msg?.type === 'log' && msg.source === 'backend' && typeof msg.text === 'string') {
            handlers.onBackendLine(msg.text);
        }
    });

    return {
        frontend: vite,
        stop: () => {
            killProcessTree(vite.pid);
        },
    };
};

export const nodeDistPlatform = (platform: NodeJS.Platform, arch: NodeJS.Architecture): string => {
    if (platform === 'win32' && arch === 'x64') return 'win-x64';
    if (platform === 'win32' && arch === 'arm64') return 'win-arm64';
    if (platform === 'darwin' && arch === 'arm64') return 'darwin-arm64';
    if (platform === 'darwin' && arch === 'x64') return 'darwin-x64';
    if (platform === 'linux' && arch === 'arm64') return 'linux-arm64';
    if (platform === 'linux' && arch === 'x64') return 'linux-x64';
    throw new Error(`Unsupported Node.js dist platform: ${platform}-${arch}`);
};

export const parseSha256 = (sums: string, archiveName: string): string => {
    for (const line of sums.split(/\r?\n/)) {
        const match = line.match(/^([0-9a-f]{64})\s+\*?(\S+)\s*$/i);
        if (match && match[2] === archiveName) return match[1].toLowerCase();
    }
    throw new Error(`No SHASUM256 entry for ${archiveName}`);
};

const formatZodError = (prefix: string, error: z.ZodError): string =>
    `${prefix}\n` +
    error.issues
        .map((i) => {
            const path = i.path.map(String).join('.');
            return `  ${path.length > 0 ? path : '(root)'}: ${i.message}`;
        })
        .join('\n');

export const parseConfig = (raw: unknown, source: string): LeptonProjectConfig => {
    const parsed = leptonConfigSchema.safeParse(raw);
    if (!parsed.success) {
        throw new Error(formatZodError(`Invalid config in ${source}:`, parsed.error));
    }
    const { $schema: _schema, ...config } = parsed.data;
    return config;
};
