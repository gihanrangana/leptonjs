/**
 * Shape of the Rust addon exposed via `#[napi]` macros in `native/src/lib.rs`.
 */
export enum WindowEventKind {
    Created = 0,
    Closed = 1,
    Error = 2,
}

export interface WindowEvent {
    id: number;
    kind: WindowEventKind;
    message?: string;
}

export type WindowEventListener = (event: WindowEvent) => void;

export interface NativeWindowOptions {
    visible: boolean;
    decorations: boolean;
    center: boolean;
    width?: number;
    height?: number;
    backgroundColor?: [number, number, number, number];
    devTools?: boolean;
}

export interface NativeModule {
    createWindow(
        url: string,
        title: string,
        initScript: string | null,
        options: NativeWindowOptions,
        onEvent: WindowEventListener,
    ): number;
    showWindow(id: number): void;
    closeWindow(id: number): void;
    openDevTools(id: number): void;
    reloadWindow(id: number): void;
    setAppUserModelId(id: string): void;
    quit(): void;
}
