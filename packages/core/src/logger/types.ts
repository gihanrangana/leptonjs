/**
 * LeptonJS Desktop — Logging Types.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory = 'ipc' | 'native' | 'hmr' | 'app' | 'server' | 'client';

export interface LogEntry {
    readonly level: LogLevel;
    readonly category: LogCategory;
    readonly message: string;
    readonly timestamp: number;
    readonly stack?: string;
    readonly details?: unknown;
}

export interface Logger {
    debug(category: LogCategory, message: string, details?: unknown): void;
    info(category: LogCategory, message: string, details?: unknown): void;
    warn(category: LogCategory, message: string, details?: unknown): void;
    error(category: LogCategory, message: string, error?: unknown): void;
}
