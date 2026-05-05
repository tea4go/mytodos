use crate::config::AppConfig;
use crate::{log_error, log_info, log_warn};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const TAG: &str = "gist";

#[derive(Debug, Serialize, Deserialize)]
pub struct GistFile {
    pub filename: Option<String>,
    pub raw_url: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GistResponse {
    pub id: String,
    pub description: Option<String>,
    pub files: HashMap<String, GistFile>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize)]
struct CreateGistRequest {
    description: String,
    files: HashMap<String, serde_json::Value>,
    public: bool,
    access_token: String,
}

#[derive(Debug, Serialize)]
struct UpdateGistRequest {
    files: HashMap<String, serde_json::Value>,
    access_token: String,
}

fn map_status(status: u16, body: String) -> String {
    match status {
        401 | 403 => "AuthError: invalid or expired PAT".into(),
        404 => "NotFound: gist not found".into(),
        _ => format!("API error {}: {}", status, body),
    }
}

#[tauri::command]
pub async fn gist_get(gist_id: String) -> Result<GistResponse, String> {
    log_info!(TAG, "gist_get: gist_id={}", gist_id);

    let cfg = AppConfig::load();
    let client = Client::new();
    let url = format!("{}/gists/{}?access_token={}", cfg.gitee_api_base, gist_id, cfg.gitee_pat);
    let resp = client.get(&url).header("User-Agent", "MyTodos").send().await
        .map_err(|e| {
            let msg = format!("Network error: {}", e);
            log_error!(TAG, "gist_get 网络请求失败: {}", msg);
            msg
        })?;
    let status = resp.status().as_u16();
    if resp.status().is_success() {
        let result = resp.json::<GistResponse>().await.map_err(|e| {
            let msg = format!("Parse error: {}", e);
            log_error!(TAG, "gist_get 解析响应失败: {}", msg);
            msg
        })?;
        log_info!(TAG, "gist_get 成功: gist_id={}, files={}", gist_id, result.files.len());
        Ok(result)
    } else {
        let body = resp.text().await.unwrap_or_default();
        let msg = map_status(status, body);
        log_error!(TAG, "gist_get API 错误: {}", msg);
        Err(msg)
    }
}

#[tauri::command]
pub async fn gist_create(description: String, files: HashMap<String, String>) -> Result<GistResponse, String> {
    log_info!(TAG, "gist_create: description={}, files={}", description, files.len());

    let cfg = AppConfig::load();
    let client = Client::new();
    let url = format!("{}/gists", cfg.gitee_api_base);
    let mut api_files: HashMap<String, serde_json::Value> = HashMap::new();
    for (k, v) in &files {
        api_files.insert(k.clone(), serde_json::json!({ "content": v }));
    }
    let body = CreateGistRequest {
        description,
        files: api_files,
        public: false,
        access_token: cfg.gitee_pat.clone(),
    };
    let resp = client.post(&url).header("User-Agent", "MyTodos").json(&body).send().await
        .map_err(|e| {
            let msg = format!("Network error: {}", e);
            log_error!(TAG, "gist_create 网络请求失败: {}", msg);
            msg
        })?;
    let status = resp.status().as_u16();
    if resp.status().is_success() {
        let result = resp.json::<GistResponse>().await.map_err(|e| {
            let msg = format!("Parse error: {}", e);
            log_error!(TAG, "gist_create 解析响应失败: {}", msg);
            msg
        })?;
        log_info!(TAG, "gist_create 成功: gist_id={}", result.id);
        Ok(result)
    } else {
        let body = resp.text().await.unwrap_or_default();
        let msg = map_status(status, body);
        log_error!(TAG, "gist_create API 错误: {}", msg);
        Err(msg)
    }
}

#[tauri::command]
pub async fn gist_update(gist_id: String, files: HashMap<String, String>) -> Result<GistResponse, String> {
    log_info!(TAG, "gist_update: gist_id={}, files={}", gist_id, files.len());

    let cfg = AppConfig::load();
    let client = Client::new();
    let url = format!("{}/gists/{}", cfg.gitee_api_base, gist_id);
    let mut api_files: HashMap<String, serde_json::Value> = HashMap::new();
    for (k, v) in &files {
        api_files.insert(k.clone(), serde_json::json!({ "content": v }));
    }
    let body = UpdateGistRequest {
        files: api_files,
        access_token: cfg.gitee_pat.clone(),
    };
    let resp = client.patch(&url).header("User-Agent", "MyTodos").json(&body).send().await
        .map_err(|e| {
            let msg = format!("Network error: {}", e);
            log_error!(TAG, "gist_update 网络请求失败: {}", msg);
            msg
        })?;
    let status = resp.status().as_u16();
    if resp.status().is_success() {
        let result = resp.json::<GistResponse>().await.map_err(|e| {
            let msg = format!("Parse error: {}", e);
            log_error!(TAG, "gist_update 解析响应失败: {}", msg);
            msg
        })?;
        log_info!(TAG, "gist_update 成功: gist_id={}", result.id);
        Ok(result)
    } else {
        let body = resp.text().await.unwrap_or_default();
        let msg = map_status(status, body);
        log_error!(TAG, "gist_update API 错误: {}", msg);
        Err(msg)
    }
}
