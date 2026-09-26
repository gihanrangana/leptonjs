#![windows_subsystem = "windows"]

use std::fs::File;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(windows)]
mod job {
    use std::ffi::c_void;

    #[repr(C)]
    struct BasicLimitInfo {
        _per_process_time: i64,
        _per_job_time: i64,
        limit_flags: u32,
        _min_ws: usize,
        _max_ws: usize,
        _active_procs: u32,
        _affinity: usize,
        _priority: u32,
        _scheduling: u32,
    }

    #[repr(C)]
    struct IoCounters {
        _data: [u64; 6],
    }

    #[repr(C)]
    struct ExtendedLimitInfo {
        basic: BasicLimitInfo,
        _io: IoCounters,
        _mem: [usize; 4],
    }

    extern "system" {
        fn CreateJobObjectW(attrs: *const c_void, name: *const u16) -> *mut c_void;
        fn SetInformationJobObject(
            job: *mut c_void,
            class: u32,
            info: *const c_void,
            len: u32,
        ) -> i32;
        fn AssignProcessToJobObject(job: *mut c_void, process: *mut c_void) -> i32;
    }

    /// Assigns a child process to a Job Object that kills all children
    /// when this (parent) process exits for any reason.
    pub unsafe fn bind_child_to_parent(child_handle: *mut c_void) -> Result<(), String> {
        let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if job.is_null() {
            return Err("Failed to create Job Object".into());
        }

        let mut info: ExtendedLimitInfo = std::mem::zeroed();
        info.basic.limit_flags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE

        let ok = SetInformationJobObject(
            job,
            9, // JobObjectExtendedLimitInformation
            &info as *const _ as *const c_void,
            std::mem::size_of::<ExtendedLimitInfo>() as u32,
        );
        if ok == 0 {
            return Err("Failed to configure Job Object".into());
        }

        if AssignProcessToJobObject(job, child_handle) == 0 {
            return Err("Failed to assign process to Job Object".into());
        }
        // Intentionally leak the job handle — must stay open for
        // kill-on-close to work. OS cleans up when we exit.
        Ok(())
    }
}

#[cfg(windows)]
mod aumid {
    #[link(name = "shell32")] // ← Add this line
    extern "system" {
        fn SetCurrentProcessExplicitAppUserModelID(app_id: *const u16) -> i32;
    }

    pub fn set_from_exe_name() {
        let Some(exe) = std::env::current_exe().ok() else {
            return;
        };
        let Some(stem) = exe.file_stem() else { return };
        let id = format!("LeptonJS.{}", stem.to_string_lossy());
        let wide: Vec<u16> = id.encode_utf16().chain(std::iter::once(0)).collect();
        unsafe {
            SetCurrentProcessExplicitAppUserModelID(wide.as_ptr());
        }
    }
}

fn main() {
    if let Err(err) = run() {
        show_error(&err);
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    // Set AUMID on the host process
    #[cfg(windows)]
    aumid::set_from_exe_name();

    let (install_dir, runtime_dir) = install_paths()?;
    let launcher = install_dir.join("app").join("launcher.cjs");
    if !launcher.is_file() {
        return Err(format!("Launcher not found:\n{}", launcher.display()));
    }

    let node = resolve_node(&runtime_dir)?;
    let app_name = std::env::current_exe()
        .ok()
        .and_then(|p| p.file_stem().map(|s| s.to_string_lossy().into_owned()))
        .unwrap_or_else(|| "LeptonJS".to_string());
    let log_path = host_log_path(&app_name)?;
    let log = File::create(&log_path)
        .map_err(|e| format!("Could not write {}:\n{e}", log_path.display()))?;
    let log_err = log
        .try_clone()
        .map_err(|e| format!("Could not clone log handle:\n{e}"))?;

    let mut cmd = Command::new(&node);
    cmd.env_remove("NODE_OPTIONS");
    cmd.arg(&launcher)
        .args(std::env::args_os().skip(1))
        .current_dir(&install_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(log_err));

    // Pass AUMID to child so Node process can set the same ID
    if let Some(stem) = std::env::current_exe()
        .ok()
        .and_then(|p| p.file_stem().map(|s| s.to_string_lossy().into_owned()))
    {
        cmd.env("LEPTON_APP_ID", format!("LeptonJS.{stem}"));
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    // let status = cmd
    //     .status()
    //     .map_err(|e| format!("Failed to start {}:\n{e}", node.display()))?;

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start {}:\n{e}", node.display()))?;

    #[cfg(windows)]
    {
        use std::os::windows::io::AsRawHandle;
        unsafe {
            let _ = job::bind_child_to_parent(child.as_raw_handle() as _);
        }
    }

    let status = child
        .wait()
        .map_err(|e| format!("Failed to wait for node:\n{e}"))?;

    if status.success() {
        return Ok(());
    }

    let code = status
        .code()
        .map(|c| format!("code {c}"))
        .unwrap_or_else(|| "a signal".into());
    Err(format!(
        "The app exited with {code}.\n\nDetails: {}",
        log_path.display()
    ))
}

fn host_log_path(app_name: &str) -> Result<PathBuf, String> {
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("TEMP").map(PathBuf::from))
        .unwrap_or_else(std::env::temp_dir);
    let dir = base.join("LeptonJS").join(app_name);
    std::fs::create_dir_all(&dir).map_err(|e| format!("Could not create log directory:\n{e}"))?;
    Ok(dir.join("lepton-host.log"))
}

fn install_paths() -> Result<(PathBuf, PathBuf), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let runtime_dir = exe
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Could not resolve runtime directory.".to_string())?;
    let install_dir = runtime_dir
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Could not resolve install directory.".to_string())?;
    Ok((install_dir, runtime_dir))
}

fn resolve_node(runtime_dir: &Path) -> Result<PathBuf, String> {
    // Try branded name: {AppName}-runtime.exe (matches packager output)
    if let Some(stem) = std::env::current_exe()
        .ok()
        .and_then(|p| p.file_stem().map(|s| s.to_string_lossy().into_owned()))
    {
        let branded = runtime_dir.join(format!(
            "{stem}-runtime{}",
            if cfg!(windows) { ".exe" } else { "" }
        ));
        if branded.is_file() {
            return Ok(branded);
        }
    }

    // Fallback: plain node.exe (dev or unbundled)
    let bundled = runtime_dir.join(if cfg!(windows) { "node.exe" } else { "node" });
    if bundled.is_file() {
        return Ok(bundled);
    }
    which_node().ok_or_else(|| {
        format!(
            "Node.js not found.\nLooked for:\n{}\nand `node` on PATH.",
            bundled.display()
        )
    })
}

fn which_node() -> Option<PathBuf> {
    let name = if cfg!(windows) { "node.exe" } else { "node" };
    std::env::var_os("PATH").and_then(|paths| {
        std::env::split_paths(&paths).find_map(|dir| {
            let p = dir.join(name);
            p.is_file().then_some(p)
        })
    })
}

fn show_error(message: &str) {
    #[cfg(windows)]
    {
        use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK};

        let title = std::env::current_exe()
            .ok()
            .and_then(|p| p.file_stem().map(|s| s.to_string_lossy().into_owned()))
            .unwrap_or_else(|| "App".into());
        let text = wide(message);
        let caption = wide(&title);
        unsafe {
            MessageBoxW(
                std::ptr::null_mut(),
                text.as_ptr(),
                caption.as_ptr(),
                MB_OK | MB_ICONERROR,
            );
        }
    }

    #[cfg(not(windows))]
    eprintln!("{message}");
}

#[cfg(windows)]
fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}
