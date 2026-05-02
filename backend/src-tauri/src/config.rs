use std::env;

pub struct AppConfig {
    pub gitee_pat: String,
    pub gitee_api_base: String,
}

impl AppConfig {
    pub fn load() -> Self {
        // 加载 src-tauri/.env（编译时由 dotenvy 注入运行时变量）
        let _ = dotenvy::from_path(std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"));
        Self {
            gitee_pat: env::var("GITEE_PAT").unwrap_or_default(),
            gitee_api_base: "https://gitee.com/api/v5".to_string(),
        }
    }
}
