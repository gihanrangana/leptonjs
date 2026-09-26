import { Box, Text } from 'ink';
import type { ReactNode } from 'react';
import { MUTED, TITLE } from '../theme';

interface ChromeProps {
    header: string;
    footer: string;
    children: ReactNode;
    width: number;
    height: number;
}

export const Header = ({ text }: { text: string }): ReactNode => (
    <Text color={TITLE}>{` ${text}`}</Text>
);

export const Footer = ({ hint }: { hint: string }): ReactNode => (
    <Text color={MUTED}>{` ${hint}`}</Text>
);

export const Chrome = ({ header, footer, children, width, height }: ChromeProps): ReactNode => (
    <Box flexDirection="column" width={width} height={height}>
        <Header text={header} />
        <Box flexGrow={1}>{children}</Box>
        <Footer hint={footer} />
    </Box>
);
