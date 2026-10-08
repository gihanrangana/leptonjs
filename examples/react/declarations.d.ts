import type { api } from './src/backend/api';
import type { events } from './src/backend/events';

declare module '@leptonjs/client' {
    interface LeptonApp {
        api: typeof api;
        events: typeof events;
    }
}
