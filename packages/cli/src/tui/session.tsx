import { render } from 'ink';
import { createPlainSession } from './plain';
import { DevScreen, type DevScreenApi } from './screens/dev';
import { PipelineScreen } from './screens/pipeline';
import { RunScreen, type RunScreenApi } from './screens/run';
import type { CreateSessionOptions, Session, TaskReporter } from './types';

const createQueuedReporter = (): {
    reporter: TaskReporter;
    attach: (live: TaskReporter) => void;
} => {
    const queue: Array<(live: TaskReporter) => void> = [];
    let live: TaskReporter | null = null;

    const send = (fn: (r: TaskReporter) => void): void => {
        if (live) fn(live);
        else queue.push(fn);
    };

    return {
        reporter: {
            setTitle: (text) => send((r) => r.setTitle(text)),
            startSetup: (name) => send((r) => r.startSetup(name)),
            finishSetup: (name, ok, durationMs, error) =>
                send((r) => r.finishSetup(name, ok, durationMs, error)),
            log: (line) => send((r) => r.log(line)),
            close: () => send((r) => r.close()),
        },
        attach: (next) => {
            live = next;
            for (const fn of queue) fn(next);
            queue.length = 0;
        },
    };
};

const createInkSession = (options: CreateSessionOptions): Session => {
    const queuedBackend: string[] = [];
    const queuedFrontend: string[] = [];
    const queuedLog: string[] = [];
    let devApi: DevScreenApi | null = null;
    let runApi: RunScreenApi | null = null;
    const pipeline = createQueuedReporter();

    const instance = render(
        options.mode === 'dev' ? (
            <DevScreen
                headerText={options.headerText}
                onQuit={options.onQuit}
                register={(api) => {
                    devApi = api;
                    for (const line of queuedBackend) api.appendBackend(line);
                    for (const line of queuedFrontend) api.appendFrontend(line);
                    queuedBackend.length = 0;
                    queuedFrontend.length = 0;
                }}
            />
        ) : options.mode === 'start' ? (
            <RunScreen
                headerText={options.headerText}
                onQuit={options.onQuit}
                register={(api) => {
                    runApi = api;
                    for (const line of queuedLog) api.appendLog(line);
                    queuedLog.length = 0;
                }}
            />
        ) : (
            <PipelineScreen
                headerText={options.headerText}
                onQuit={options.onQuit}
                register={pipeline.attach}
            />
        ),
        { exitOnCtrlC: false, patchConsole: true },
    );

    return {
        mode: options.mode,
        reporter: pipeline.reporter,
        appendBackend: (line) => {
            if (devApi) devApi.appendBackend(line);
            else queuedBackend.push(line);
        },
        appendFrontend: (line) => {
            if (devApi) devApi.appendFrontend(line);
            else queuedFrontend.push(line);
        },
        appendLog: (line) => {
            if (runApi) runApi.appendLog(line);
            else queuedLog.push(line);
        },
        destroy: () => {
            pipeline.reporter.close();
            instance.unmount();
        },
    };
};

export const createSession = async (options: CreateSessionOptions): Promise<Session> => {
    if (options.noTui || process.stdout.isTTY !== true) {
        return createPlainSession(options);
    }
    return createInkSession(options);
};
