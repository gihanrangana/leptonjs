//! LeptonJS Desktop — native Node addon (Rust).
//!
//! Bridges Node.js to OS-native webviews via `wry` + `tao`.
use napi::{
    threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode},
    Status, Unknown,
};
use napi_derive::napi;
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU32, Ordering},
        Once, OnceLock,
    },
};
use tao::{
    event_loop::{EventLoopBuilder, EventLoopProxy},
    window::WindowId,
};

#[cfg(target_os = "windows")]
use tao::platform::windows::EventLoopBuilderExtWindows;
use tao::{
    event::{Event, WindowEvent as TaoWindowEvent},
    event_loop::ControlFlow,
    window::WindowBuilder,
};
use wry::WebViewBuilder;

#[napi]
pub enum WindowEventKind {
    Created,
    Closed,
    Error,
}

#[napi(object)]
pub struct WindowEvent {
    pub id: u32,
    pub kind: WindowEventKind,
    pub message: Option<String>,
}

#[napi(object)]
pub struct WindowOptions {
    pub visible: bool,
    pub decorations: bool,
    pub center: bool,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub background_color: Option<Vec<u8>>,
    pub dev_tools: Option<bool>,
}

type WindowEventCallback =
    ThreadsafeFunction<WindowEvent, Unknown<'static>, WindowEvent, Status, false>;

enum Command {
    Create {
        id: u32,
        url: String,
        title: String,
        init_script: Option<String>,
        options: WindowOptions,
        on_event: WindowEventCallback,
    },
    ShowWindow {
        id: u32,
    },
    CloseWindow {
        id: u32,
    },
    OpenDevTools {
        id: u32,
    },
    ReloadWindow {
        id: u32,
    },
    Quit,
}

#[allow(dead_code)]
struct WindowEntry {
    id: u32,
    // Drop the WebView before the Window so the HWND is still valid (wry/Windows).
    webview: wry::WebView,
    window: tao::window::Window,
    on_event: WindowEventCallback,
}

struct Shared {
    proxy: EventLoopProxy<Command>,
}

static SHARED: OnceLock<Shared> = OnceLock::new();
static INIT: Once = Once::new();
static NEXT_ID: AtomicU32 = AtomicU32::new(1);

fn run_loop(event_loop: tao::event_loop::EventLoop<Command>) {
    let mut windows: HashMap<WindowId, WindowEntry> = HashMap::new();
    event_loop.run(move |event, target, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::UserEvent(cmd) => match cmd {
                Command::Create {
                    id,
                    url,
                    title,
                    init_script,
                    options,
                    on_event,
                } => {
                    let mut wb = WindowBuilder::new()
                        .with_title(title)
                        .with_visible(options.visible)
                        .with_decorations(options.decorations);

                    if let (Some(w), Some(h)) = (options.width, options.height) {
                        wb = wb.with_inner_size(tao::dpi::LogicalSize::new(w as f64, h as f64));
                    }

                    let window = match wb.build(target) {
                        Ok(w) => w,
                        Err(e) => {
                            let _ = on_event.call(
                                WindowEvent {
                                    id,
                                    kind: WindowEventKind::Error,
                                    message: Some(format!("failed to create window: {e}")),
                                },
                                ThreadsafeFunctionCallMode::NonBlocking,
                            );
                            return;
                        }
                    };

                    if options.center {
                        if let Some(monitor) = window.current_monitor() {
                            let screen = monitor.size();
                            let win = window.outer_size();
                            let x = (screen.width.saturating_sub(win.width)) / 2;
                            let y = (screen.height.saturating_sub(win.height)) / 2;
                            window.set_outer_position(tao::dpi::PhysicalPosition::new(x, y));
                        }
                    }

                    let wid = window.id();
                    let mut builder = WebViewBuilder::new().with_url(url);

                    if let Some(script) = init_script {
                        builder = builder.with_initialization_script(script);
                    }

                    if let Some(rgba) = options.background_color {
                        if rgba.len() == 4 {
                            builder =
                                builder.with_background_color((rgba[0], rgba[1], rgba[2], rgba[3]));
                        }
                    }

                    if options.dev_tools.unwrap_or(false) {
                        builder = builder.with_devtools(true);
                    }

                    let webview = match builder.build(&window) {
                        Ok(w) => w,
                        Err(e) => {
                            let _ = on_event.call(
                                WindowEvent {
                                    id,
                                    kind: WindowEventKind::Error,
                                    message: Some(format!("failed to create webview: {e}")),
                                },
                                ThreadsafeFunctionCallMode::NonBlocking,
                            );
                            return;
                        }
                    };
                    let _ = on_event.call(
                        WindowEvent {
                            id,
                            kind: WindowEventKind::Created,
                            message: None,
                        },
                        ThreadsafeFunctionCallMode::NonBlocking,
                    );
                    windows.insert(
                        wid,
                        WindowEntry {
                            id,
                            webview,
                            window,
                            on_event,
                        },
                    );
                }
                Command::ShowWindow { id } => {
                    for entry in windows.values() {
                        if entry.id == id {
                            entry.window.set_visible(true);
                            break;
                        }
                    }
                }
                Command::CloseWindow { id } => {
                    let mut to_remove = None;
                    for (&wid, entry) in &windows {
                        if entry.id == id {
                            to_remove = Some(wid);
                            break;
                        }
                    }
                    if let Some(wid) = to_remove {
                        if let Some(entry) = windows.remove(&wid) {
                            let _ = entry.on_event.call(
                                WindowEvent {
                                    id: entry.id,
                                    kind: WindowEventKind::Closed,
                                    message: None,
                                },
                                ThreadsafeFunctionCallMode::NonBlocking,
                            );
                        }
                    }
                }
                Command::OpenDevTools { id } => {
                    for entry in windows.values() {
                        if entry.id == id {
                            entry.webview.open_devtools();
                            break;
                        }
                    }
                }
                Command::ReloadWindow { id } => {
                    for entry in windows.values() {
                        if entry.id == id {
                            let _ = entry.webview.reload();
                            break;
                        }
                    }
                }
                Command::Quit => {
                    let ids: Vec<_> = windows.keys().copied().collect();
                    for wid in ids {
                        if let Some(entry) = windows.remove(&wid) {
                            let _ = entry.on_event.call(
                                WindowEvent {
                                    id: entry.id,
                                    kind: WindowEventKind::Closed,
                                    message: None,
                                },
                                ThreadsafeFunctionCallMode::NonBlocking,
                            );
                        }
                    }
                }
            },
            Event::WindowEvent {
                window_id,
                event: TaoWindowEvent::CloseRequested,
                ..
            } => {
                if let Some(entry) = windows.remove(&window_id) {
                    let _ = entry.on_event.call(
                        WindowEvent {
                            id: entry.id,
                            kind: WindowEventKind::Closed,
                            message: None,
                        },
                        ThreadsafeFunctionCallMode::NonBlocking,
                    );
                }
            }
            _ => {}
        }
    });
}

fn ensure_loop_started() -> napi::Result<&'static Shared> {
    INIT.call_once(|| {
        let (tx, rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            #[cfg(target_os = "windows")]
            let event_loop = EventLoopBuilder::<Command>::with_user_event()
                .with_any_thread(true)
                .build();
            #[cfg(not(target_os = "windows"))]
            let event_loop = EventLoopBuilder::<Command>::with_user_event().build();
            let proxy = event_loop.create_proxy();
            let _ = tx.send(proxy);
            run_loop(event_loop);
        });
        match rx.recv() {
            Ok(proxy) => {
                let _ = SHARED.set(Shared { proxy });
            }
            Err(_) => {}
        }
    });
    SHARED.get().ok_or_else(|| {
        napi::Error::new(
            Status::GenericFailure,
            "lepton: native event loop failed to start",
        )
    })
}

#[napi]
pub fn create_window(
    url: String,
    title: String,
    init_script: Option<String>,
    options: WindowOptions,
    #[napi(ts_arg_type = "(event: WindowEvent) => void")] on_event: WindowEventCallback,
) -> napi::Result<u32> {
    let shared = ensure_loop_started()?;
    let id = NEXT_ID.fetch_add(1, Ordering::SeqCst);

    shared
        .proxy
        .send_event(Command::Create {
            id,
            url,
            title,
            init_script,
            options,
            on_event,
        })
        .map_err(|_| napi::Error::new(Status::GenericFailure, "Failed to send create command"))?;

    Ok(id)
}

#[napi]
pub fn show_window(id: u32) -> napi::Result<()> {
    if let Some(shared) = SHARED.get() {
        let _ = shared.proxy.send_event(Command::ShowWindow { id });
    }
    Ok(())
}

#[napi]
pub fn close_window(id: u32) -> napi::Result<()> {
    if let Some(shared) = SHARED.get() {
        let _ = shared.proxy.send_event(Command::CloseWindow { id });
    }
    Ok(())
}

#[napi]
pub fn open_dev_tools(id: u32) -> napi::Result<()> {
    if let Some(shared) = SHARED.get() {
        let _ = shared.proxy.send_event(Command::OpenDevTools { id });
    }
    Ok(())
}

#[napi]
pub fn reload_window(id: u32) -> napi::Result<()> {
    if let Some(shared) = SHARED.get() {
        let _ = shared.proxy.send_event(Command::ReloadWindow { id });
    }
    Ok(())
}

#[cfg(windows)]
#[napi]
pub fn set_app_user_model_id(id: String) -> napi::Result<()> {
    extern "system" {
        fn SetCurrentProcessExplicitAppUserModelID(app_id: *const u16) -> i32;
    }
    let wide: Vec<u16> = id.encode_utf16().chain(std::iter::once(0)).collect();
    let hr = unsafe { SetCurrentProcessExplicitAppUserModelID(wide.as_ptr()) };
    if hr != 0 {
        return Err(napi::Error::from_reason(format!(
            "SetCurrentProcessExplicitAppUserModelID failed: HRESULT {hr:#X}"
        )));
    }
    Ok(())
}

#[cfg(not(windows))]
#[napi]
pub fn set_app_user_model_id(_id: String) -> napi::Result<()> {
    Ok(()) // no-op on non-Windows
}

#[napi]
pub fn quit() -> napi::Result<()> {
    if let Some(shared) = SHARED.get() {
        let _ = shared.proxy.send_event(Command::Quit);
    }
    Ok(())
}
