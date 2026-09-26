import { Box, Text } from 'ink';
import type { ReactNode } from 'react';
import { FAIL_FG, MUTED, OK_FG, RUN_FG, TITLE } from '../theme';
import type { PipelineStep, StepStatus } from '../types';

const mark = (status: StepStatus): { glyph: string; color: string } => {
    switch (status) {
        case 'ok':
            return { glyph: '✓', color: OK_FG };
        case 'fail':
            return { glyph: '✗', color: FAIL_FG };
        case 'running':
            return { glyph: '…', color: RUN_FG };
        default:
            return { glyph: '·', color: MUTED };
    }
};

const StepRow = ({ step }: { step: PipelineStep }): ReactNode => {
    const { glyph, color } = mark(step.status);

    const time = step.durationMs !== undefined ? ` (${(step.durationMs / 1000).toFixed(1)}s)` : '';

    return (
        <Box flexDirection="column">
            <Text>
                <Text color={color}>{glyph}</Text>
                <Text color={step.status === 'running' ? TITLE : undefined}>
                    {step.name}
                    {time}
                </Text>
            </Text>

            {step.error ? <Text color={FAIL_FG}>{`    ${step.error}`}</Text> : null}
        </Box>
    );
};

export const StepList = ({ steps }: { steps: PipelineStep[] }): ReactNode => (
    <Box flexDirection="column" paddingX={1}>
        {steps.map((step) => (
            <StepRow key={step.name} step={step} />
        ))}
    </Box>
);
