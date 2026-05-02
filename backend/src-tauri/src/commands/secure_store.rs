use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;

static STORE: Lazy<Mutex<HashMap<String, String>>> = Lazy::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
pub async fn secure_store(key: String, value: String) -> Result<(), String> {
    let mut s = STORE.lock().map_err(|e| format!("Lock error: {}", e))?;
    s.insert(key, value);
    Ok(())
}

#[tauri::command]
pub async fn secure_get(key: String) -> Result<Option<String>, String> {
    let s = STORE.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(s.get(&key).cloned())
}

#[tauri::command]
pub async fn secure_remove(key: String) -> Result<(), String> {
    let mut s = STORE.lock().map_err(|e| format!("Lock error: {}", e))?;
    s.remove(&key);
    Ok(())
}
