import type { Ora } from 'ora';
import ora from 'ora';
import type { CreateSessionOptions, Session, TaskReporter } from './types';

const createPlainReporter = (): TaskReporter => {
    let spinner: Ora | null = null;

    const clearSpinner = (): void => {
        if (!spinner) return;
        spinner.stop();
        spinner = null;
    };

    return {
        setTitle: (text) => {
            clearSpinner();
            console.log(text);
        },
        startSetup: (name) => {
            clearSpinner();
            spinner = ora(name).start();
        },
        finishSetup: (name, ok, durationMs, error) => {
            const label = `${name} (${(durationMs / 1000).toFixed(1)}s)`;
            const failText = error ? `${label}\n    ${error}` : label;

            if (spinner) {
                if (ok) spinner.succeed(label);
                else spinner.fail(failText);
                spinner = null;
                return;
            }

            if (ok) ora().succeed(label);
            else ora().fail(failText);
        },
        log: (line) => {
            if (spinner) spinner.clear();
            console.log(line);
        },
        close: () => {
            clearSpinner();
        },
    };
};

export const createPlainSession = (options: CreateSessionOptions): Session => {
    console.log(options.headerText);

    const reporter = createPlainReporter();

    return {
        mode: options.mode,
        reporter,
        appendBackend: (line) => console.log(`[backend] ${line}`),
        appendFrontend: (line) => console.log(`[frontend] ${line}`),
        appendLog: (line) => console.log(line),
        destroy: () => {
            reporter.close();
        },
    };
};
