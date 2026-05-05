use crate::{log_error, log_info};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;

const TAG: &str = "secure_store";

static STORE: Lazy<Mutex<HashMap<String, String>>> = Lazy::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
pub async fn secure_store(key: String, value: String) -> Result<(), String> {
    log_info!(TAG, "secure_store: key={}", key);
    let mut s = STORE.lock().map_err(|e| {
        let msg = format!("Lock error: {}", e);
        log_error!(TAG, "secure_store 锁失败: {}", msg);
        msg
    })?;
    s.insert(key, value);
    Ok(())
}

#[tauri::command]
pub async fn secure_get(key: String) -> Result<Option<String>, String> {
    log_info!(TAG, "secure_get: key={}", key);
    let s = STORE.lock().map_err(|e| {
        let msg = format!("Lock error: {}", e);
        log_error!(TAG, "secure_get 锁失败: {}", msg);
        msg
    })?;
    let val = s.get(&key).cloned();
    log_info!(TAG, "secure_get: key={}, found={}", key, val.is_some());
    Ok(val)
}

#[tauri::command]
pub async fn secure_remove(key: String) -> Result<(), String> {
    log_info!(TAG, "secure_remove: key={}", key);
    let mut s = STORE.lock().map_err(|e| {
        let msg = format!("Lock error: {}", e);
        log_error!(TAG, "secure_remove 锁失败: {}", msg);
        msg
    })?;
    s.remove(&key);
    Ok(())
}
