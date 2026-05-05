mod commands;
mod config;
mod log_helper;

use commands::{gist, release, secure_store};

#[cfg(target_os = "android")]
fn init_android_logger() {
    android_logger::init_once(
        android_logger::Config::default()
            .with_max_level(log::LevelFilter::Trace)
            .with_tag("mytodos"),
    );
    // 将 panic 信息输出到 Android logcat，同时尝试检查 JNI 异常
    std::panic::set_hook(Box::new(|panic_info| {
        log::error!("RUST PANIC: {}", panic_info);
        // 如果是 JNI 异常，尝试获取 Java 异常详情
        // （但 panic hook 中无法访问 JNIEnv，所以只能打印 Rust 侧信息）
    }));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "android")]
    init_android_logger();

    log::info!("mytodos lib loaded, about to start tauri...");

    // 在 tauri 启动前打印设备信息，确认代码能执行到这里
    #[cfg(target_os = "android")]
    {
        log::info!("Android device info will be logged by Java layer");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            log_helper::log_frontend,
            gist::gist_get,
            gist::gist_create,
            gist::gist_update,
            secure_store::secure_store,
            secure_store::secure_get,
            secure_store::secure_remove,
            release::download_release,
            release::cancel_download_release,
            release::open_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
