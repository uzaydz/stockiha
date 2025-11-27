#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod updater;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};

#[tauri::command]
fn ping() -> String {
    "pong".to_string()
}

fn main() {
    tauri::Builder::default()
        // Plugins
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("stockiha".to_string()),
                    },
                ))
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // تهيئة نظام التحديثات التلقائي
            updater::init(&handle);

            log::info!("[Main] Application starting...");

            // إعداد القوائم
            setup_menus(app)?;

            // إرسال حدث جاهزية التطبيق
            let _ = handle.emit("app-ready", ());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            // أوامر التحديثات
            updater::check_for_updates,
            updater::download_update,
            updater::install_update,
            updater::get_version,
            updater::get_last_check_time,
            updater::get_update_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_menus(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();

    #[cfg(target_os = "macos")]
    let app_menu = Submenu::new(handle, "Stockiha", true)?;

    let file_menu = Submenu::with_items(
        handle,
        "File",
        true,
        &[&PredefinedMenuItem::close_window(handle, Some("Close"))?],
    )?;

    let edit_menu = Submenu::with_items(
        handle,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(handle, Some("Undo"))?,
            &PredefinedMenuItem::redo(handle, Some("Redo"))?,
            &PredefinedMenuItem::cut(handle, Some("Cut"))?,
            &PredefinedMenuItem::copy(handle, Some("Copy"))?,
            &PredefinedMenuItem::paste(handle, Some("Paste"))?,
            &PredefinedMenuItem::select_all(handle, Some("Select All"))?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        handle,
        "View",
        true,
        &[&PredefinedMenuItem::fullscreen(
            handle,
            Some("Toggle Fullscreen"),
        )?],
    )?;

    let window_menu = Submenu::with_items(
        handle,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(handle, Some("Minimize"))?,
            &PredefinedMenuItem::maximize(handle, Some("Maximize"))?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::close_window(handle, Some("Close"))?,
        ],
    )?;

    let help_menu = Submenu::with_items(
        handle,
        "Help",
        true,
        &[
            &MenuItem::with_id(handle, "about", "About Stockiha", true, None::<&str>)?,
            &MenuItem::with_id(handle, "docs", "Documentation", true, None::<&str>)?,
            &MenuItem::with_id(handle, "support", "Support", true, None::<&str>)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(handle, "check_updates", "Check for Updates", true, None::<&str>)?,
            &PredefinedMenuItem::separator(handle)?,
            &MenuItem::with_id(
                handle,
                "devtools",
                "Toggle Developer Tools",
                true,
                None::<&str>,
            )?,
        ],
    )?;

    let menu = Menu::with_items(
        handle,
        &[
            #[cfg(target_os = "macos")]
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ],
    )?;

    app.set_menu(menu)?;

    app.on_menu_event(|app, event| {
        let event_id = event.id().0.as_str();
        match event_id {
            "about" => {
                let _ = app.emit("menu-event", "about");
            }
            "docs" => {
                let _ = app.emit("menu-event", "docs");
            }
            "support" => {
                let _ = app.emit("menu-event", "support");
            }
            "check_updates" => {
                let _ = app.emit("menu-event", "check_updates");
            }
            "devtools" => {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            _ => {}
        }
    });

    Ok(())
}
