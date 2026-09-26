import type { ChildProcess } from 'node:child_process';

export interface SpawnedDev {
    frontend: ChildProcess;
    stop: () => void;
}
