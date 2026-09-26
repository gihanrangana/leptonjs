export type CliMode = 'dev' | 'build' | 'pack' | 'start';

export type StepStatus = 'pending' | 'running' | 'ok' | 'fail';

export interface PipelineStep {
    name: string;
    status: StepStatus;
    durationMs?: number;
    error?: string;
}

export interface TaskReporter {
    setTitle: (text: string) => void;
    startSetup: (name: string) => void;
    finishSetup: (name: string, ok: boolean, durationMs: number, error?: string) => void;
    log: (line: string) => void;
    close: () => void;
}

export interface Session {
    mode: CliMode;
    reporter: TaskReporter;
    appendBackend: (line: string) => void;
    appendFrontend: (line: string) => void;
    appendLog: (line: string) => void;
    destroy: () => void;
}

export interface CreateSessionOptions {
    mode: CliMode;
    headerText: string;
    noTui: boolean;
    onQuit: () => void;
}
