//! نظام التحديثات المتكامل لـ Stockiha
//!
//! يوفر هذا الموديول:
//! - فحص تلقائي للتحديثات عند بدء التطبيق
//! - فحص دوري كل 4 ساعات
//! - IPC commands للتحكم من Frontend

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;
use tokio::sync::Mutex;
use tokio::time::{interval, sleep};

/// الفترة بين فحوصات التحديث التلقائية (4 ساعات)
const AUTO_CHECK_INTERVAL: Duration = Duration::from_secs(4 * 60 * 60);

/// التأخير قبل الفحص الأول (30 ثانية)
const INITIAL_CHECK_DELAY: Duration = Duration::from_secs(30);

/// مهلة فحص التحديثات (30 ثانية)
const CHECK_TIMEOUT: Duration = Duration::from_secs(30);

/// حالة التحديث
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdateStatus {
    Idle,
    Checking,
    Available,
    NotAvailable,
    Downloading,
    Downloaded,
    Installing,
    Error,
}

/// معلومات التحديث المتاح
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

/// تقدم التنزيل
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percent: f64,
    pub bytes_per_second: u64,
}

/// حدث التحديث للإرسال إلى Frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
pub enum UpdateEvent {
    #[serde(rename = "checking")]
    Checking,

    #[serde(rename = "available")]
    Available { info: UpdateInfo },

    #[serde(rename = "not-available")]
    NotAvailable { current_version: String },

    #[serde(rename = "progress")]
    Progress { progress: DownloadProgress },

    #[serde(rename = "downloaded")]
    Downloaded { info: UpdateInfo },

    #[serde(rename = "error")]
    Error { message: String, recoverable: bool },

    #[serde(rename = "installing")]
    Installing,
}

/// نتيجة فحص التحديث
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
    pub available: bool,
    pub info: Option<UpdateInfo>,
    pub error: Option<String>,
}

/// حالة المُحدِّث المشتركة
pub struct UpdaterState {
    is_checking: AtomicBool,
    is_downloading: AtomicBool,
    has_update: AtomicBool,
    update_version: Mutex<Option<String>>,
    update_body: Mutex<Option<String>>,
    last_check: Mutex<Option<chrono::DateTime<chrono::Utc>>>,
}

impl Default for UpdaterState {
    fn default() -> Self {
        Self {
            is_checking: AtomicBool::new(false),
            is_downloading: AtomicBool::new(false),
            has_update: AtomicBool::new(false),
            update_version: Mutex::new(None),
            update_body: Mutex::new(None),
            last_check: Mutex::new(None),
        }
    }
}

/// إرسال حدث التحديث إلى Frontend
fn emit_update_event(app: &AppHandle, event: UpdateEvent) {
    if let Err(e) = app.emit("tauri-update", &event) {
        log::error!("[Updater] Failed to emit event: {:?}", e);
    }
}

/// الحصول على الإصدار الحالي
fn get_current_version(app: &AppHandle) -> String {
    app.package_info().version.to_string()
}

/// فحص التحديثات
#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<CheckResult, String> {
    let state = app.state::<Arc<UpdaterState>>();

    // انتظار إذا كان هناك فحص جاري (بحد أقصى 35 ثانية)
    let mut wait_count = 0;
    while state.is_checking.load(Ordering::SeqCst) {
        if wait_count >= 70 {
            // 70 * 500ms = 35 seconds
            log::warn!("[Updater] Timeout waiting for previous check to complete");
            // إعادة تعيين الحالة للسماح بفحص جديد
            state.is_checking.store(false, Ordering::SeqCst);
            break;
        }
        sleep(Duration::from_millis(500)).await;
        wait_count += 1;
    }

    // محاولة الحصول على القفل
    if state.is_checking.swap(true, Ordering::SeqCst) {
        // إذا كان لا يزال قيد الفحص، أعد الحالة الحالية
        log::info!("[Updater] Check already in progress, returning current state");
        let has_update = state.has_update.load(Ordering::SeqCst);
        if has_update {
            let version = state.update_version.lock().await.clone();
            let body = state.update_body.lock().await.clone();
            return Ok(CheckResult {
                available: true,
                info: Some(UpdateInfo {
                    version: version.unwrap_or_default(),
                    current_version: get_current_version(&app),
                    body,
                    date: None,
                }),
                error: None,
            });
        }
        return Ok(CheckResult {
            available: false,
            info: None,
            error: None,
        });
    }

    log::info!("[Updater] Starting update check...");
    emit_update_event(&app, UpdateEvent::Checking);

    let result = check_for_updates_internal(&app, &state).await;

    // تحديث وقت آخر فحص
    {
        let mut last_check = state.last_check.lock().await;
        *last_check = Some(chrono::Utc::now());
    }

    state.is_checking.store(false, Ordering::SeqCst);

    result
}

async fn check_for_updates_internal(
    app: &AppHandle,
    state: &Arc<UpdaterState>,
) -> Result<CheckResult, String> {
    let current_version = get_current_version(app);

    // استخدام timeout للفحص
    let updater = match app.updater() {
        Ok(u) => u,
        Err(e) => {
            let error_msg = format!("Failed to get updater: {}", e);
            log::error!("[Updater] {}", error_msg);
            emit_update_event(
                app,
                UpdateEvent::Error {
                    message: error_msg.clone(),
                    recoverable: true,
                },
            );
            return Ok(CheckResult {
                available: false,
                info: None,
                error: Some(error_msg),
            });
        }
    };

    let check_result = tokio::time::timeout(CHECK_TIMEOUT, updater.check()).await;

    match check_result {
        Ok(Ok(Some(update))) => {
            let info = UpdateInfo {
                version: update.version.clone(),
                current_version: current_version.clone(),
                body: update.body.clone(),
                date: update.date.map(|d| d.to_string()),
            };

            log::info!(
                "[Updater] Update available: v{} -> v{}",
                current_version,
                info.version
            );
            emit_update_event(app, UpdateEvent::Available { info: info.clone() });

            // حفظ معلومات التحديث
            state.has_update.store(true, Ordering::SeqCst);
            {
                let mut ver = state.update_version.lock().await;
                *ver = Some(update.version.clone());
            }
            {
                let mut body = state.update_body.lock().await;
                *body = update.body.clone();
            }

            Ok(CheckResult {
                available: true,
                info: Some(info),
                error: None,
            })
        }
        Ok(Ok(None)) => {
            log::info!(
                "[Updater] No update available. Current: v{}",
                current_version
            );
            emit_update_event(
                app,
                UpdateEvent::NotAvailable {
                    current_version: current_version.clone(),
                },
            );

            state.has_update.store(false, Ordering::SeqCst);

            Ok(CheckResult {
                available: false,
                info: None,
                error: None,
            })
        }
        Ok(Err(e)) => {
            let error_msg = format!("Update check failed: {}", e);
            log::error!("[Updater] {}", error_msg);
            emit_update_event(
                app,
                UpdateEvent::Error {
                    message: error_msg.clone(),
                    recoverable: true,
                },
            );

            Ok(CheckResult {
                available: false,
                info: None,
                error: Some(error_msg),
            })
        }
        Err(_) => {
            let error_msg = "Update check timed out".to_string();
            log::error!("[Updater] {}", error_msg);
            emit_update_event(
                app,
                UpdateEvent::Error {
                    message: error_msg.clone(),
                    recoverable: true,
                },
            );

            Ok(CheckResult {
                available: false,
                info: None,
                error: Some(error_msg),
            })
        }
    }
}

/// تنزيل وتثبيت التحديث
#[tauri::command]
pub async fn download_update(app: AppHandle) -> Result<bool, String> {
    let state = app.state::<Arc<UpdaterState>>();

    // تجنب التنزيلات المتزامنة
    if state.is_downloading.swap(true, Ordering::SeqCst) {
        return Err("Download already in progress".to_string());
    }

    // التحقق من وجود تحديث
    if !state.has_update.load(Ordering::SeqCst) {
        state.is_downloading.store(false, Ordering::SeqCst);
        return Err("No update available to download".to_string());
    }

    let update_version = {
        let ver = state.update_version.lock().await;
        ver.clone().unwrap_or_default()
    };

    log::info!("[Updater] Starting download for v{}...", update_version);
    emit_update_event(
        &app,
        UpdateEvent::Progress {
            progress: DownloadProgress {
                downloaded: 0,
                total: 0,
                percent: 0.0,
                bytes_per_second: 0,
            },
        },
    );

    // إعادة فحص وتنزيل
    let check_result = app.updater().map_err(|e| {
        state.is_downloading.store(false, Ordering::SeqCst);
        e.to_string()
    })?;

    match check_result.check().await {
        Ok(Some(update)) => {
            let current_version = get_current_version(&app);
            let update_version = update.version.clone();
            let update_body = update.body.clone();
            let app_clone = app.clone();

            // تنزيل وتثبيت
            // on_chunk(chunk_size: usize, content_length: Option<u64>)
            // on_download_finish()
            match update
                .download_and_install(
                    |chunk_size, content_length| {
                        log::debug!(
                            "[Updater] Downloaded chunk: {} bytes, total: {:?}",
                            chunk_size,
                            content_length
                        );
                    },
                    || {
                        log::info!("[Updater] Download finished, installing...");
                    },
                )
                .await
            {
                Ok(_) => {
                    let info = UpdateInfo {
                        version: update_version,
                        current_version,
                        body: update_body,
                        date: None,
                    };

                    log::info!("[Updater] Update installed successfully");
                    emit_update_event(&app_clone, UpdateEvent::Downloaded { info });
                    state.has_update.store(false, Ordering::SeqCst);
                    state.is_downloading.store(false, Ordering::SeqCst);

                    Ok(true)
                }
                Err(e) => {
                    let error_msg = format!("Download/install failed: {}", e);
                    log::error!("[Updater] {}", error_msg);
                    emit_update_event(
                        &app_clone,
                        UpdateEvent::Error {
                            message: error_msg.clone(),
                            recoverable: false,
                        },
                    );
                    state.is_downloading.store(false, Ordering::SeqCst);
                    Err(error_msg)
                }
            }
        }
        Ok(None) => {
            state.is_downloading.store(false, Ordering::SeqCst);
            state.has_update.store(false, Ordering::SeqCst);
            Err("No update available".to_string())
        }
        Err(e) => {
            state.is_downloading.store(false, Ordering::SeqCst);
            Err(format!("Check failed: {}", e))
        }
    }
}

/// إعادة تشغيل التطبيق لتطبيق التحديث
#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    log::info!("[Updater] Restarting to apply update...");
    emit_update_event(&app, UpdateEvent::Installing);

    // إعادة تشغيل التطبيق
    app.restart();
}

/// الحصول على معلومات الإصدار الحالي
#[tauri::command]
pub fn get_version(app: AppHandle) -> String {
    get_current_version(&app)
}

/// الحصول على وقت آخر فحص
#[tauri::command]
pub async fn get_last_check_time(app: AppHandle) -> Option<String> {
    let state = app.state::<Arc<UpdaterState>>();
    let last_check = state.last_check.lock().await;
    last_check.map(|t| t.to_rfc3339())
}

/// الحصول على حالة التحديث الحالية
#[tauri::command]
pub async fn get_update_status(app: AppHandle) -> UpdateStatus {
    let state = app.state::<Arc<UpdaterState>>();

    if state.is_downloading.load(Ordering::SeqCst) {
        UpdateStatus::Downloading
    } else if state.is_checking.load(Ordering::SeqCst) {
        UpdateStatus::Checking
    } else if state.has_update.load(Ordering::SeqCst) {
        UpdateStatus::Available
    } else {
        UpdateStatus::Idle
    }
}

/// بدء فحص التحديثات التلقائي في الخلفية
pub fn start_auto_updater(app: AppHandle) {
    let state = Arc::new(UpdaterState::default());
    app.manage(state.clone());

    // تشغيل الفحص التلقائي في الخلفية
    tauri::async_runtime::spawn(async move {
        // انتظار قبل الفحص الأول
        log::info!(
            "[Updater] Auto-updater started. First check in {:?}",
            INITIAL_CHECK_DELAY
        );
        sleep(INITIAL_CHECK_DELAY).await;

        let mut check_interval = interval(AUTO_CHECK_INTERVAL);

        loop {
            // الفحص الأول فوراً، ثم كل 4 ساعات
            if !state.is_checking.load(Ordering::SeqCst) {
                log::info!("[Updater] Running scheduled update check...");
                let _ = check_for_updates(app.clone()).await;
            }

            check_interval.tick().await;
        }
    });
}

/// تهيئة نظام التحديثات
pub fn init(app: &AppHandle) {
    log::info!("[Updater] Initializing update system...");
    start_auto_updater(app.clone());
}
