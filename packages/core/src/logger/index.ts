import type { LogCategory, LogEntry, Logger, LogLevel } from './types';

export class LeptonLogger implements Logger {
    private readonly levelPriority: Record<LogLevel, number> = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
    };

    private minLevel: LogLevel = 'info';

    constructor(minLevel?: LogLevel) {
        if (minLevel) this.minLevel = minLevel;
        else if (process.env.LEPTON_DEBUG === '1' || process.env.DEBUG) this.minLevel = 'debug';
    }

    setLevel(level: LogLevel): void {
        this.minLevel = level;
    }

    private log(
        level: LogLevel,
        category: LogCategory,
        message: string,
        details?: unknown,
        stack?: string,
    ): void {
        if (this.levelPriority[level] < this.levelPriority[this.minLevel]) return;

        const entry: LogEntry = {
            level,
            category,
            message,
            timestamp: Date.now(),
            ...(stack ? { stack } : {}),
            ...(details !== undefined ? { details } : {}),
        };

        this.emit(entry);
    }

    private formatTimestamp(ts: number): string {
        const d = new Date(ts);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    private emit(entry: LogEntry): void {
        const time = this.formatTimestamp(entry.timestamp);
        const level = entry.level.toUpperCase().padEnd(5);
        const prefix = `${time} [${level}] [${entry.category}] ${entry.message}`;

        let text = prefix;

        if (entry.details !== undefined && !(entry.stack && entry.details === entry.message)) {
            const detailsString =
                typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details);
            text += `Details: ${detailsString}`;
        }

        if (entry.stack) text += `\n${entry.stack}`;

        if (entry.level === 'error') console.error(text);
        else if (entry.level === 'warn') console.warn(text);
        else if (entry.level === 'info') console.info(text);
        else console.log(text);
    }

    debug(category: LogCategory, message: string, details?: unknown): void {
        this.log('debug', category, message, details);
    }

    info(category: LogCategory, message: string, details?: unknown): void {
        this.log('info', category, message, details);
    }

    warn(category: LogCategory, message: string, details?: unknown): void {
        this.log('warn', category, message, details);
    }

    error(category: LogCategory, message: string, error?: unknown): void {
        let stack: string | undefined;
        let details: unknown;

        if (error instanceof Error) {
            stack = error.stack;
            details = error.message;
        } else if (error !== undefined) {
            details = error;
        }

        this.log('error', category, message, details, stack);
    }
}

export const logger = new LeptonLogger();
export * from './types';
