import { useInput, useWindowSize } from 'ink';
import { type ReactNode, useEffect } from 'react';
import { Chrome } from '../components/chrome';
import { LogPane } from '../components/log-pane';
import { CHROME_ROWS, VITE_FG } from '../theme';
import { useLogBuffer } from '../use-log-buffer';

export interface RunScreenApi {
    appendLog: (log: string) => void;
}

interface RunScreenProps {
    headerText: string;
    onQuit: () => void;
    register: (api: RunScreenApi) => void;
}

export const RunScreen = ({ headerText, register, onQuit }: RunScreenProps): ReactNode => {
    const { columns, rows } = useWindowSize();

    const logs = useLogBuffer();

    useEffect(() => {
        register({ appendLog: logs.push });
    }, [register, logs.push]);

    useInput((input, key) => {
        if (key.ctrl && (input === 'q' || input === 'c')) onQuit();
    });

    return (
        <Chrome
            header={headerText}
            footer="Ctrl+C / Ctrl+Q quit · --no-tui for plain logs"
            width={columns}
            height={rows}
        >
            <LogPane
                title="OUTPUT"
                lines={logs.lines}
                color={VITE_FG}
                focused
                bodyRows={Math.max(3, rows - CHROME_ROWS)}
            />
        </Chrome>
    );
};
