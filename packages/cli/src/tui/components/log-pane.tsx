import { Box, Text } from 'ink';
import type { ReactNode } from 'react';
import { BORDER, TITLE } from '../theme';

const sliceTail = (lines: string[], max: number): string[] =>
    lines.length > max ? lines.slice(-max) : lines;

interface LogPaneProps {
    title: string;
    lines: string[];
    color: string;
    focused: boolean;
    bodyRows: number;
}

export const LogPane = ({ title, lines, color, focused, bodyRows }: LogPaneProps): ReactNode => {
    const visible = sliceTail(lines, Math.max(1, bodyRows));
    const pad = Math.max(0, bodyRows - visible.length);

    return (
        <Box
            flexGrow={1}
            flexBasis={0}
            flexDirection="column"
            borderStyle="single"
            borderColor={focused ? TITLE : BORDER}
            paddingX={2}
            overflow="hidden"
        >
            <Text color={TITLE} bold={focused} wrap="wrap">
                {title}
                {focused ? ' ●' : ''}
            </Text>

            <Box flexDirection="column" flexGrow={1} overflow="hidden">
                {Array.from({ length: pad }, (_, i) => (
                    <Text key={`pad-${i.toString()}`}> </Text>
                ))}

                {visible.map((line, i) => (
                    <Text
                        key={`${i.toString()}-${line.slice(0, 32)}`}
                        color={color}
                        wrap="truncate"
                    >
                        {line.length > 0 ? line : ' '}
                    </Text>
                ))}
            </Box>
        </Box>
    );
};
