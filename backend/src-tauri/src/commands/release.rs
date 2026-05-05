use crate::{log_error, log_info};
use reqwest::Client;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Window};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

const TAG: &str = "release";

static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Serialize, Clone)]
struct DownloadProgress {
    received: u64,
    total: Option<u64>,
}

fn default_download_dir() -> PathBuf {
    #[cfg(target_os = "android")]
    {
        return PathBuf::from("/storage/emulated/0/Download");
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(p) = std::env::var("USERPROFILE") {
            return PathBuf::from(p).join("Downloads");
        }
    }

    if let Ok(p) = std::env::var("HOME") {
        return PathBuf::from(p).join("Downloads");
    }
    PathBuf::from(".")
}

fn sanitize_file_name(name: &str) -> String {
    let mut s: String = name
        .chars()
        .filter(|c| !matches!(c, '/' | '\\' | '\0'))
        .collect();
    if s.trim().is_empty() {
        s = "mytodos-installer".to_string();
    }
    s
}

#[tauri::command]
pub async fn download_release(
    window: Window,
    url: String,
    file_name: String,
) -> Result<String, String> {
    log_info!(TAG, "download_release: url={}, file_name={}", url, file_name);
    CANCEL_FLAG.store(false, Ordering::SeqCst);

    let dir = default_download_dir();
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| {
            let msg = format!("无法创建下载目录：{}", e);
            log_error!(TAG, "download_release 创建目录失败: {}", msg);
            msg
        })?;
    }
    let safe_name = sanitize_file_name(&file_name);
    let dest = dir.join(&safe_name);
    let tmp = dir.join(format!("{}.part", safe_name));

    let client = Client::builder()
        .user_agent("MyTodos")
        .build()
        .map_err(|e| {
            let msg = format!("HTTP 客户端初始化失败：{}", e);
            log_error!(TAG, "download_release 客户端初始化失败: {}", msg);
            msg
        })?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| {
            let msg = format!("Network error: {}", e);
            log_error!(TAG, "download_release 网络请求失败: {}", msg);
            msg
        })?;
    let status = resp.status();
    if !status.is_success() {
        let msg = format!("下载失败 HTTP {}", status.as_u16());
        log_error!(TAG, "download_release {}", msg);
        return Err(msg);
    }
    let total = resp.content_length();

    let mut file = File::create(&tmp)
        .await
        .map_err(|e| {
            let msg = format!("无法创建文件：{}", e);
            log_error!(TAG, "download_release 创建临时文件失败: {}", msg);
            msg
        })?;

    let mut received: u64 = 0;
    let _ = window.emit(
        "release-download-progress",
        DownloadProgress { received, total },
    );

    let mut resp = resp;
    loop {
        if CANCEL_FLAG.load(Ordering::SeqCst) {
            drop(file);
            let _ = std::fs::remove_file(&tmp);
            log_info!(TAG, "download_release 用户取消下载");
            return Err("用户已取消".into());
        }
        match resp
            .chunk()
            .await
            .map_err(|e| {
                let msg = format!("下载读取失败：{}", e);
                log_error!(TAG, "download_release 读取流失败: {}", msg);
                msg
            })?
        {
            Some(chunk) => {
                file.write_all(&chunk)
                    .await
                    .map_err(|e| {
                        let msg = format!("写入失败：{}", e);
                        log_error!(TAG, "download_release 写入文件失败: {}", msg);
                        msg
                    })?;
                received += chunk.len() as u64;
                let _ = window.emit(
                    "release-download-progress",
                    DownloadProgress { received, total },
                );
            }
            None => break,
        }
    }
    file.flush()
        .await
        .map_err(|e| {
            let msg = format!("flush 失败：{}", e);
            log_error!(TAG, "download_release flush 失败: {}", msg);
            msg
        })?;
    drop(file);

    if dest.exists() {
        let _ = std::fs::remove_file(&dest);
    }
    std::fs::rename(&tmp, &dest).map_err(|e| {
        let msg = format!("重命名失败：{}", e);
        log_error!(TAG, "download_release 重命名失败: {}", msg);
        msg
    })?;

    log_info!(TAG, "download_release 完成: path={}", dest.display());
    Ok(dest.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn cancel_download_release() {
    log_info!(TAG, "cancel_download_release");
    CANCEL_FLAG.store(true, Ordering::SeqCst);
}

#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    log_info!(TAG, "open_path: path={}", path);

    #[cfg(target_os = "windows")]
    {
        match std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
        {
            Ok(_) => {
                log_info!(TAG, "open_path 成功 (Windows)");
                return Ok(());
            }
            Err(e) => {
                let msg = format!("打开失败：{}", e);
                log_error!(TAG, "open_path {}", msg);
                return Err(msg);
            }
        }
    }
    #[cfg(target_os = "macos")]
    {
        match std::process::Command::new("open").arg(&path).spawn() {
            Ok(_) => {
                log_info!(TAG, "open_path 成功 (macOS)");
                return Ok(());
            }
            Err(e) => {
                let msg = format!("打开失败：{}", e);
                log_error!(TAG, "open_path {}", msg);
                return Err(msg);
            }
        }
    }
    #[cfg(target_os = "linux")]
    {
        match std::process::Command::new("xdg-open").arg(&path).spawn() {
            Ok(_) => {
                log_info!(TAG, "open_path 成功 (Linux)");
                return Ok(());
            }
            Err(e) => {
                let msg = format!("打开失败：{}", e);
                log_error!(TAG, "open_path {}", msg);
                return Err(msg);
            }
        }
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let _ = path;
        let msg = "当前平台不支持直接打开安装包".into();
        log_error!(TAG, "open_path {}", msg);
        return Err(msg);
    }
    #[allow(unreachable_code)]
    {
        let msg = "当前平台不支持".into();
        log_error!(TAG, "open_path {}", msg);
        Err(msg)
    }
}
