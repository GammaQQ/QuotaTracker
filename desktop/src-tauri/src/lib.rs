use std::process::Command;
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{TrayIconBuilder, TrayIconId},
    Manager,
};

#[tauri::command]
fn fetch_usage() -> Result<serde_json::Value, String> {
    let binary = find_binary().ok_or("quotatracker binary not found")?;

    let output = Command::new(&binary)
        .output()
        .map_err(|e| format!("Failed to run quotatracker: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("quotatracker exited with {}: {}", output.status, stderr));
    }

    let json: serde_json::Value =
        serde_json::from_slice(&output.stdout).map_err(|e| format!("JSON parse error: {}", e))?;

    Ok(json)
}

#[tauri::command]
fn update_tray(app: tauri::AppHandle, title: String, tooltip: String) -> Result<(), String> {
    let tray = app.tray_by_id(&TrayIconId::new("main")).ok_or("tray not found")?;
    let _ = tray.set_title(Some(&title));
    let _ = tray.set_tooltip(Some(&tooltip));
    Ok(())
}

fn find_binary() -> Option<String> {
    let home = dirs_next().unwrap_or_default();
    let candidates = vec![
        format!("{}/pets/aiusage/aiusage/quotatracker", home),
        format!("{}/.local/bin/quotatracker", home),
        "/usr/local/bin/quotatracker".to_string(),
        "quotatracker".to_string(),
    ];

    for path in &candidates {
        if std::path::Path::new(path).is_file() {
            return Some(path.clone());
        }
    }
    Some("quotatracker".to_string())
}

fn dirs_next() -> Option<String> {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()
}

fn toggle_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let show = MenuItemBuilder::with_id("show", "Show / Hide").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&show, &quit]).build()?;

            let icon = Image::from_bytes(include_bytes!("../icons/tray.png"))
                .expect("failed to load tray icon");

            let handle = app.handle().clone();
            let handle2 = app.handle().clone();

            TrayIconBuilder::with_id("main")
                .icon(icon)
                .icon_as_template(true)
                .title("AI")
                .tooltip("QuotaTracker")
                .menu(&menu)
                .on_menu_event(move |_app, event| match event.id().as_ref() {
                    "show" => toggle_window(&handle),
                    "quit" => std::process::exit(0),
                    _ => {}
                })
                .on_tray_icon_event(move |_tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        toggle_window(&handle2);
                    }
                })
                .build(app)?;

            // Hide dock icon on macOS
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![fetch_usage, update_tray])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
