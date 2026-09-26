import { Box, useInput, useWindowSize } from 'ink';
import { type ReactNode, useEffect, useState } from 'react';
import { Chrome } from '../components/chrome';
import { LogPane } from '../components/log-pane';
import { StepList } from '../components/step-list';
import { MUTED } from '../theme';
import type { PipelineStep, TaskReporter } from '../types';
import { useLogBuffer } from '../use-log-buffer';

interface PipelineScreenProps {
    headerText: string;
    onQuit: () => void;
    register: (api: TaskReporter) => void;
}

export const PipelineScreen = ({
    headerText: _headerText,
    onQuit,
    register,
}: PipelineScreenProps): ReactNode => {
    const { columns, rows } = useWindowSize();
    const [title, setTitle] = useState<string>('');
    const [steps, setSteps] = useState<PipelineStep[]>([]);
    const logs = useLogBuffer();

    useEffect(() => {
        const upsert = (name: string, patch: Partial<PipelineStep>): void => {
            setSteps((prev) => {
                const index = prev.findIndex((step) => step.name === name);
                if (index === -1) return [...prev, { name, status: 'pending', ...patch }];
                return prev.map((step, i) => (i === index ? { ...step, ...patch } : step));
            });
        };

        register({
            setTitle,
            startSetup: (name) => {
                upsert(name, { status: 'running', error: undefined, durationMs: undefined });
            },
            finishSetup: (name, ok, durationMs, error) => {
                upsert(name, { status: ok ? 'ok' : 'fail', durationMs, error });
            },
            log: logs.push,
            close: () => {},
        });
    }, [register, logs.push]);

    useInput((input, key) => {
        if (key.ctrl && (input === 'q' || input === 'c')) onQuit();
    });

    const stepRows = Math.min(steps.length + 2, Math.max(6, Math.floor(rows / 3)));
    const logRows = Math.max(3, rows - stepRows - 4);

    return (
        <Chrome
            header={title}
            footer="Ctrl+C / Ctrl+Q quit · --no-tui for ora/plain"
            width={columns}
            height={rows}
        >
            <Box flexDirection="column" flexGrow={1}>
                <Box flexShrink={0}>
                    <StepList steps={steps} />
                </Box>
                <LogPane title="LOG" lines={logs.lines} color={MUTED} focused bodyRows={logRows} />
            </Box>
        </Chrome>
    );
};
