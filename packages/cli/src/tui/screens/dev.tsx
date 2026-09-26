import { Box, useInput, useWindowSize } from 'ink';
import { type ReactNode, useEffect, useState } from 'react';
import { Chrome } from '../components/chrome';
import { LogPane } from '../components/log-pane';
import { BACKEND_FG, CHROME_ROWS, VITE_FG, WIDE_LAYOUT_MIN_COLS } from '../theme';
import { useLogBuffer } from '../use-log-buffer';

type PanelId = 'backend' | 'frontend';

export interface DevScreenApi {
    appendBackend: (line: string) => void;
    appendFrontend: (line: string) => void;
}

interface DevScreenProps {
    headerText: string;
    onQuit: () => void;
    register: (api: DevScreenApi) => void;
}

export const DevScreen = ({ headerText, onQuit, register }: DevScreenProps): ReactNode => {
    const { columns, rows } = useWindowSize();
    const sideBySide = columns >= WIDE_LAYOUT_MIN_COLS;
    const [focused, setFocused] = useState<PanelId>('backend');
    const backend = useLogBuffer();
    const frontend = useLogBuffer();

    useEffect(() => {
        register({
            appendBackend: backend.push,
            appendFrontend: frontend.push,
        });
    }, [register, backend.push, frontend.push]);

    useInput((input, key) => {
        if (key.tab) {
            setFocused((prev) => (prev === 'backend' ? 'frontend' : 'backend'));
            return;
        }

        if (key.ctrl && (input === 'q' || input === 'c')) onQuit();
    });

    const paneChrome = 3;
    const bodyRows = sideBySide
        ? Math.max(3, rows - CHROME_ROWS - paneChrome)
        : Math.max(3, Math.floor((rows - CHROME_ROWS) / 2) - paneChrome);

    return (
        <Chrome
            header={headerText}
            footer="Tab switch pane · Ctrl+C / Ctrl+Q quit · --no-tui for ora/plain"
            width={columns}
            height={rows}
        >
            <Box
                flexGrow={1}
                flexDirection={sideBySide ? 'row' : 'column'}
                gap={sideBySide ? 1 : 0}
            >
                <LogPane
                    title="BACKEND"
                    lines={backend.lines}
                    color={BACKEND_FG}
                    focused={focused === 'backend'}
                    bodyRows={bodyRows}
                />
                <LogPane
                    title="FRONTEND"
                    lines={frontend.lines}
                    color={VITE_FG}
                    focused={focused === 'frontend'}
                    bodyRows={bodyRows}
                />
            </Box>
        </Chrome>
    );
};
