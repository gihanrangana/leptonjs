/**
 * Plain shared DTOs — no zod, no Node/DOM APIs.
 * Safe to import from both backend and frontend.
 */
export interface AppInfo {
    name: string;
    version: string;
}
