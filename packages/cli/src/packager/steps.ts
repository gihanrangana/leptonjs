import type { TaskReporter } from '../tui/types';
import type { StepResult } from './types';

export const runStep = async (
    reporter: TaskReporter,
    name: string,
    fn: () => Promise<unknown> | unknown,
): Promise<StepResult> => {
    reporter.startSetup(name);
    const t0 = Date.now();

    try {
        await fn();
        const durationMs = Date.now() - t0;
        reporter.finishSetup(name, true, durationMs);
        return { name, durationMs, success: true };
    } catch (e) {
        const durationMs = Date.now() - t0;
        const error = e instanceof Error ? e.message : String(e);
        reporter.finishSetup(name, false, durationMs, error);
        throw e;
    }
};
