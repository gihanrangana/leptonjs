import { useEffect, useRef, useState } from 'react';
import { FLUSH_MS, MAX_LINES } from './theme';

const sliceTail = (lines: string[], max: number): string[] =>
    lines.length > max ? lines.slice(-max) : lines;

export const useLogBuffer = (): {
    lines: string[];
    push: (line: string) => void;
} => {
    const [lines, setLines] = useState<string[]>([]);
    const pending = useRef<string[]>([]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (pending.current.length === 0) return;

            const chunk = pending.current;
            pending.current = [];
            setLines((prev) => sliceTail(prev.concat(chunk), MAX_LINES));
        }, FLUSH_MS);

        return () => clearInterval(timer);
    }, []);

    return {
        lines,
        push: (line: string) => {
            pending.current.push(line);
        },
    };
};
