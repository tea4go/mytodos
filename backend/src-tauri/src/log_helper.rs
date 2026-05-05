//! MyTodos 日志模块
//!
//! 参考 log4go (beego/logs) 设计，提供：
//! - 9 级日志（Emergency=0 .. Debug=7, Print=8）
//! - 文件输出 + 控制台输出（带 ANSI 颜色）
//! - 文件按天滚动 + 日志保留天数
//! - 格式化：`[PID] HH:MM:SS 文件名:行号(函数) [LEVEL]> 消息`
//! - Tauri 命令 `log_frontend` 供前端调用写日志
//! - Rust 宏 `log_error!` / `log_warn!` / ... 统一出口

use chrono::Local;
use once_cell::sync::Lazy;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

// ====== 日志级别（与 log4go 一致） ======
pub const LEVEL_EMERGENCY: u8 = 0;
pub const LEVEL_ALERT: u8 = 1;
pub const LEVEL_CRITICAL: u8 = 2;
pub const LEVEL_ERROR: u8 = 3;
pub const LEVEL_WARNING: u8 = 4;
pub const LEVEL_NOTICE: u8 = 5;
pub const LEVEL_INFO: u8 = 6;
pub const LEVEL_DEBUG: u8 = 7;
pub const LEVEL_PRINT: u8 = 8;

const LEVEL_PREFIX: [&str; 10] =
    ["[M]", "[A]", "[C]", "[E]", "[W]", "[N]", "[I]", "[D]", "[P]", "[?]"];

const LEVEL_NAMES: [&str; 10] = [
    "Emergency", "Alert", "Critical", "Error",
    "Warning", "Notice", "Info", "Debug", "Print", "?",
];

// ANSI 颜色（与 log4go console.go 的 colors 数组一致）
const LEVEL_COLORS: [&str; 9] = [
    "1;37;41", // Emergency  高亮白+红底
    "1;37;45", // Alert      高亮白+紫红底
    "1;33;46", // Critical   高亮黄+青底
    "1;31",    // Error      高亮红
    "1;33",    // Warning    高亮黄
    "1;32",    // Notice     高亮绿
    "1;34",    // Info       高亮蓝
    "1;37",    // Debug      高亮白
    "1;37",    // Print      高亮白
];

// ====== 全局日志器 ======
pub static LOGGER: Lazy<Logger> = Lazy::new(|| {
    let log_dir = get_log_dir();
    let _ = fs::create_dir_all(&log_dir);
    Logger::new(log_dir.join("mytodos.log"), LEVEL_DEBUG)
});

fn get_log_dir() -> PathBuf {
    #[cfg(target_os = "android")]
    {
        // Android: 写入公共下载目录下的 logs 子目录
        return PathBuf::from("/storage/emulated/0/Download/mytodos-logs");
    }
    // 桌面端：应用数据目录
    if let Ok(p) = std::env::var("APPDATA") {
        // Windows: C:\Users\<user>\AppData\Roaming\mytodos\logs
        return PathBuf::from(p).join("mytodos").join("logs");
    }
    if let Ok(p) = std::env::var("HOME") {
        return PathBuf::from(p).join(".mytodos").join("logs");
    }
    // 兜底：当前目录下 logs
    PathBuf::from("logs")
}

// ====== 日志写入器特征 ======
trait LogWriter: Send {
    fn write(&mut self, msg: &str) -> std::io::Result<()>;
}

// ====== 控制台写入器（带 ANSI 颜色） ======
struct ConsoleWriter {
    level: u8,
    color: bool,
}

impl ConsoleWriter {
    fn new(level: u8, color: bool) -> Self {
        Self { level, color }
    }
}

impl LogWriter for ConsoleWriter {
    fn write(&mut self, msg: &str) -> std::io::Result<()> {
        if self.color {
            // 用 ANSI 颜色包裹消息
            let stripped = msg.strip_suffix('\n').unwrap_or(msg);
            // 提取最后一级别前缀以确定颜色
            let color_idx = LEVEL_PREFIX
                .iter()
                .position(|p| msg.contains(p))
                .unwrap_or(LEVEL_NOTICE as usize);
            let color = LEVEL_COLORS.get(color_idx).unwrap_or(&"1;37");
            eprintln!("\x1b[{}m{}\x1b[0m", color, stripped);
        } else {
            eprint!("{}", msg);
        }
        Ok(())
    }
}

// ====== 文件写入器（按天滚动，保留 7 天） ======
struct FileWriter {
    file: File,
    path: PathBuf,
    log_dir: PathBuf,
    max_days: i64,
    today: u32,
}

impl FileWriter {
    fn new(path: PathBuf, max_days: i64) -> std::io::Result<Self> {
        let log_dir = path.parent().unwrap_or(&path).to_path_buf();
        fs::create_dir_all(&log_dir)?;
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path)?;
        let today = Local::now().format("%Y%m%d").to_string();
        let today_num: u32 = today.parse().unwrap_or(0);
        Ok(Self {
            file,
            path,
            log_dir,
            max_days,
            today: today_num,
        })
    }

    fn check_rotate(&mut self) -> std::io::Result<()> {
        let today = Local::now().format("%Y%m%d").to_string();
        let today_num: u32 = today.parse().unwrap_or(0);
        if today_num != self.today {
            // 日期变了，归档旧文件
            let old_path = self.path.with_extension(format!(
                "{}.log",
                self.today
            ));
            // 关闭旧文件
            let _ = self.file.flush();
            // 重命名当前日志到归档文件
            let _ = fs::rename(&self.path, &old_path);
            // 打开新文件
            self.file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&self.path)?;
            self.today = today_num;
            // 清理超出保留天数的旧日志
            self.cleanup_old_logs();
        }
        Ok(())
    }

    fn cleanup_old_logs(&self) {
        let cutoff = Local::now() - chrono::Duration::days(self.max_days);
        if let Ok(entries) = fs::read_dir(&self.log_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Ok(meta) = fs::metadata(&path) {
                    if let Ok(modified) = meta.modified() {
                        let modified: chrono::DateTime<Local> = modified.into();
                        if modified < cutoff {
                            if let Some(ext) = path.extension() {
                                if ext == "log" {
                                    let _ = fs::remove_file(&path);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

impl LogWriter for FileWriter {
    fn write(&mut self, msg: &str) -> std::io::Result<()> {
        self.check_rotate()?;
        self.file.write_all(msg.as_bytes())?;
        self.file.flush()?;
        Ok(())
    }
}

// ====== 日志器 ======
pub struct Logger {
    console: Mutex<ConsoleWriter>,
    file: Mutex<FileWriter>,
}

impl Logger {
    fn new(log_path: PathBuf, level: u8) -> Self {
        let fw = FileWriter::new(log_path, 7).unwrap_or_else(|e| {
            // 如果文件打开失败，直接 panic（日志不可用应尽早暴露）
            panic!("无法初始化日志文件：{}", e);
        });
        Self {
            console: Mutex::new(ConsoleWriter::new(level, true)),
            file: Mutex::new(fw),
        }
    }

    /// 写日志（两个输出：控制台 + 文件）
    pub fn write(&self, level: u8, file: &str, line: u32, func: &str, msg: &str) {
        let level = level.min(LEVEL_DEBUG);
        let now = Local::now();
        let time_str = now.format("%H:%M:%S").to_string();
        let pid = std::process::id();
        let prefix = LEVEL_PREFIX[level as usize];
        let level_name = LEVEL_NAMES[level as usize];

        // 格式：`[PID] HH:MM:SS 文件名:行号(函数) [LEVEL]> 消息`
        let log_line = format!(
            "[{}] {} {}:{}({}) {}> {}\n",
            pid, time_str, file, line, func, prefix, msg
        );

        // 写文件
        if let Ok(mut f) = self.file.lock() {
            let _ = f.write(&log_line);
        }

        // 写控制台（带颜色）
        if let Ok(mut c) = self.console.lock() {
            let _ = c.write(&log_line);
        }
    }

    /// 写日志 — 无调用位置信息（供前端调用时使用，函数名传 "frontend"）
    pub fn write_simple(&self, level: u8, msg: &str) {
        let level = level.min(LEVEL_DEBUG);
        let now = Local::now();
        let time_str = now.format("%H:%M:%S").to_string();
        let pid = std::process::id();
        let prefix = LEVEL_PREFIX[level as usize];

        let log_line = format!(
            "[{}] {} (frontend) {}> {}\n",
            pid, time_str, prefix, msg
        );

        if let Ok(mut f) = self.file.lock() {
            let _ = f.write(&log_line);
        }
        if let Ok(mut c) = self.console.lock() {
            let _ = c.write(&log_line);
        }
    }
}

// ====== Rust 侧宏 ======
// 使用方式：
//   log_error!("gist_get", "网络请求失败: {}", err);
//   或：
//   log_error!("gist_get", |e| format!("网络请求失败: {}", e));
#[macro_export]
macro_rules! log_emergency {
    ($tag:expr, $($arg:tt)*) => {
        $crate::log_helper::LOGGER.write(
            $crate::log_helper::LEVEL_EMERGENCY,
            file!(), line!(), $tag,
            &format!($($arg)*)
        );
    };
}

#[macro_export]
macro_rules! log_alert {
    ($tag:expr, $($arg:tt)*) => {
        $crate::log_helper::LOGGER.write(
            $crate::log_helper::LEVEL_ALERT,
            file!(), line!(), $tag,
            &format!($($arg)*)
        );
    };
}

#[macro_export]
macro_rules! log_critical {
    ($tag:expr, $($arg:tt)*) => {
        $crate::log_helper::LOGGER.write(
            $crate::log_helper::LEVEL_CRITICAL,
            file!(), line!(), $tag,
            &format!($($arg)*)
        );
    };
}

#[macro_export]
macro_rules! log_error {
    ($tag:expr, $($arg:tt)*) => {
        $crate::log_helper::LOGGER.write(
            $crate::log_helper::LEVEL_ERROR,
            file!(), line!(), $tag,
            &format!($($arg)*)
        );
    };
}

#[macro_export]
macro_rules! log_warn {
    ($tag:expr, $($arg:tt)*) => {
        $crate::log_helper::LOGGER.write(
            $crate::log_helper::LEVEL_WARNING,
            file!(), line!(), $tag,
            &format!($($arg)*)
        );
    };
}

#[macro_export]
macro_rules! log_notice {
    ($tag:expr, $($arg:tt)*) => {
        $crate::log_helper::LOGGER.write(
            $crate::log_helper::LEVEL_NOTICE,
            file!(), line!(), $tag,
            &format!($($arg)*)
        );
    };
}

#[macro_export]
macro_rules! log_info {
    ($tag:expr, $($arg:tt)*) => {
        $crate::log_helper::LOGGER.write(
            $crate::log_helper::LEVEL_INFO,
            file!(), line!(), $tag,
            &format!($($arg)*)
        );
    };
}

#[macro_export]
macro_rules! log_debug {
    ($tag:expr, $($arg:tt)*) => {
        $crate::log_helper::LOGGER.write(
            $crate::log_helper::LEVEL_DEBUG,
            file!(), line!(), $tag,
            &format!($($arg)*)
        );
    };
}

/// Tauri 命令：供前端调用写入日志
/// 前端传 `level`（0-8）和 `message`
#[tauri::command]
pub async fn log_frontend(level: u8, message: String) -> Result<(), String> {
    let level = level.min(LEVEL_DEBUG);
    LOGGER.write_simple(level, &message);
    Ok(())
}
