import { printBanner, readVersion } from '../banner';
import { spawnDevProcesses } from '../helpers';
import { resolveAppRoot } from '../resolve-app-root';
import { resolveProject } from '../resolve-project';
import { createSession } from '../tui/session';
import type { Session } from '../tui/types';

export const runDev = async (target: string | undefined, noTui: boolean): Promise<void> => {
    const project = resolveProject(resolveAppRoot(target));
    const headerText = `LeptonJS v${readVersion()}  app: ${project.appRoot}  vite: :${project.port}`;

    let procs: ReturnType<typeof spawnDevProcesses> | null = null;
    let session: Session | null = null;

    const cleanup = (): void => {
        try {
            session?.destroy();
        } catch {
            /* already destroyed */
        }
    };

    const shutdown = (code = 0): void => {
        procs?.stop();
        cleanup();
        process.exit(code);
    };

    process.on('SIGINT', () => shutdown(0));
    process.on('SIGTERM', () => shutdown(0));
    process.on('uncaughtException', (e) => {
        procs?.stop();
        cleanup();
        console.error(e);
        process.exit(1);
    });
    process.on('exit', () => cleanup());

    if (!noTui && process.stdout.isTTY === true) printBanner();

    session = await createSession({
        mode: 'dev',
        headerText,
        noTui,
        onQuit: () => shutdown(0),
    });

    try {
        session.appendBackend(`[lepton] appRoot=${project.appRoot}`);
        session.appendBackend(`[lepton] backend=${project.backendEntry}`);
        session.appendFrontend(`[lepton] frontend=${project.frontendDir}`);
        session.appendFrontend(`[lepton] port=${project.port}`);

        procs = spawnDevProcesses(project, {
            onBackendLine: session.appendBackend,
            onFrontendLine: session.appendFrontend,
        });

        procs.frontend.on('exit', (code: number | null) => {
            session?.appendFrontend(`[lepton] frontend exited with code ${code ?? 0}`);
            shutdown(code ?? 0);
        });
    } catch (error) {
        cleanup();
        throw error;
    }
};
