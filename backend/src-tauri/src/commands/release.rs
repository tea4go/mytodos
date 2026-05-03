use reqwest::Client;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Window};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Serialize, Clone)]
struct DownloadProgress {
    received: u64,
    total: Option<u64>,
}

fn default_download_dir() -> PathBuf {
    // Android：写入公共下载目录
    #[cfg(target_os = "android")]
    {
        return PathBuf::from("/storage/emulated/0/Download");
    }

    // 其他平台：用户主目录下的 Downloads
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
    // 防御：去除路径分隔符和异常字符
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
    CANCEL_FLAG.store(false, Ordering::SeqCst);

    let dir = default_download_dir();
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| format!("无法创建下载目录：{}", e))?;
    }
    let safe_name = sanitize_file_name(&file_name);
    let dest = dir.join(&safe_name);
    let tmp = dir.join(format!("{}.part", safe_name));

    let client = Client::builder()
        .user_agent("MyTodos")
        .build()
        .map_err(|e| format!("HTTP 客户端初始化失败：{}", e))?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;
    let status = resp.status();
    if !status.is_success() {
        return Err(format!("下载失败 HTTP {}", status.as_u16()));
    }
    let total = resp.content_length();

    let mut file = File::create(&tmp)
        .await
        .map_err(|e| format!("无法创建文件：{}", e))?;

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
            return Err("用户已取消".into());
        }
        match resp
            .chunk()
            .await
            .map_err(|e| format!("下载读取失败：{}", e))?
        {
            Some(chunk) => {
                file.write_all(&chunk)
                    .await
                    .map_err(|e| format!("写入失败：{}", e))?;
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
        .map_err(|e| format!("flush 失败：{}", e))?;
    drop(file);

    // 重命名 .part → 最终文件
    if dest.exists() {
        let _ = std::fs::remove_file(&dest);
    }
    std::fs::rename(&tmp, &dest).map_err(|e| format!("重命名失败：{}", e))?;

    Ok(dest.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn cancel_download_release() {
    CANCEL_FLAG.store(true, Ordering::SeqCst);
}

#[tauri::command]
pub fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("打开失败：{}", e))?;
        return Ok(());
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开失败：{}", e))?;
        return Ok(());
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("打开失败：{}", e))?;
        return Ok(());
    }
    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        // 移动端暂不支持直接调起安装器；前端应给出指引
        let _ = path;
        return Err("当前平台不支持直接打开安装包".into());
    }
    #[allow(unreachable_code)]
    Err("当前平台不支持".into())
}
