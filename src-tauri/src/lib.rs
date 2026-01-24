//! Apple Music Client - Tauri Backend
//!
//! This library provides the Rust backend for the Apple Music client,
//! including JWT token generation for MusicKit authentication.

pub mod commands;
pub mod discord;
pub mod musickit;

/// Initialize environment variables for Wayland compatibility on Linux.
/// WebKitGTK's GPU-accelerated rendering has issues with many Wayland compositors.
#[cfg(target_os = "linux")]
fn init_linux_env() {
    // Disable WebKitGTK compositing mode for Wayland compatibility
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    // Disable DMA-BUF renderer which causes issues on Wayland
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    // Disable GPU sandbox for better compatibility
    std::env::set_var("WEBKIT_FORCE_SANDBOX", "0");
    // Use software rendering if hardware acceleration fails
    std::env::set_var("WEBKIT_DISABLE_ACCELERATED_2D_CANVAS", "1");
}

#[cfg(not(target_os = "linux"))]
fn init_linux_env() {
    // No-op on other platforms
}

use commands::{get_developer_token, is_musickit_configured, refresh_developer_token};
use discord::{discord_clear_activity, discord_connect, discord_disconnect, discord_set_activity};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    webview::WebviewWindowBuilder,
    Emitter, Manager, Runtime,
};

/// Run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize Linux-specific environment variables for Wayland compatibility
    // Must be called before Tauri/WebKitGTK initializes
    init_linux_env();

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // Set up system tray
            setup_tray(app)?;

            // Set up global shortcuts (desktop only)
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            {
                app.handle().plugin(tauri_plugin_global_shortcut::Builder::new().build())?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_developer_token,
            refresh_developer_token,
            is_musickit_configured,
            open_mini_player,
            close_mini_player,
            hide_main_window,
            show_main_window,
            discord_connect,
            discord_disconnect,
            discord_set_activity,
            discord_clear_activity,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Set up the system tray icon and menu
fn setup_tray<R: Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    let play_pause = MenuItem::with_id(app, "play_pause", "Play/Pause", true, None::<&str>)?;
    let next = MenuItem::with_id(app, "next", "Next", true, None::<&str>)?;
    let previous = MenuItem::with_id(app, "previous", "Previous", true, None::<&str>)?;
    let separator = MenuItem::with_id(app, "sep", "─────────", false, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&play_pause, &next, &previous, &separator, &show, &quit])?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Apple Music")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "play_pause" => {
                // Emit event to frontend
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray-play-pause", ());
                }
            }
            "next" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray-next", ());
                }
            }
            "previous" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray-previous", ());
                }
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

/// Open the mini player window
#[tauri::command]
async fn open_mini_player(app: tauri::AppHandle) -> Result<(), String> {
    // Check if mini player window already exists
    if app.get_webview_window("miniplayer").is_some() {
        // Focus existing window
        if let Some(window) = app.get_webview_window("miniplayer") {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    // Create new mini player window
    let url = if cfg!(debug_assertions) {
        "http://localhost:1420/miniplayer.html"
    } else {
        "miniplayer.html"
    };

    WebviewWindowBuilder::new(&app, "miniplayer", tauri::WebviewUrl::External(url.parse().unwrap()))
        .title("Mini Player")
        .inner_size(280.0, 340.0)
        .resizable(false)
        .always_on_top(true)
        .decorations(false)
        .transparent(true)
        .skip_taskbar(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Close the mini player window
#[tauri::command]
async fn close_mini_player(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("miniplayer") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Hide the main window (for mini player mode)
#[tauri::command]
async fn hide_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Show the main window
#[tauri::command]
async fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}
