//! MyTodos 日志模块
//!
//! 参考 log4go (beego/logs) 设计，提供：
//! - 9 级日志（Emergency=0 .. Debug=7, Print=8）
//! - 文件输出 + 控制台输出（带 ANSI 颜色）
//! - TCP 远程日志服务器输出（类似 log4go connWriter，含 {LogName} + {HeartBeat}）
//! - 文件按天滚动 + 日志保留天数
//! - 格式化：`[PID] HH:MM:SS 文件名:行号(函数) [LEVEL]> 消息`
//! - Tauri 命令 `log_frontend` 供前端调用写日志
//! - Rust 宏 `log_error!` / `log_warn!` / ... 统一出口
//!
//! 远程日志服务器配置方式（优先级：CLI > 环境变量 > 不启用）：
//!   1. 命令行参数：mytodos.exe --log-server=127.0.0.1:9514
//!   2. 环境变量：set LOG_SERVER=127.0.0.1:9514

use chrono::Local;
use once_cell::sync::Lazy;
use std::fs::{self, OpenOptions};
use std::io::{Write, BufReader, BufRead};
use std::net::{TcpStream, ToSocketAddrs};
use std::path::PathBuf;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

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

// ====== CLI 参数解析（--log-server=xxx） ======
/// 获取远程日志服务器地址（如果有配置）
fn resolve_log_server() -> Option<String> {
    // 1. 优先检查环境变量
    if let Ok(val) = std::env::var("LOG_SERVER") {
        let val = val.trim().to_string();
        if !val.is_empty() {
            return Some(val);
        }
    }
    if let Ok(val) = std::env::var("log_server") {
        let val = val.trim().to_string();
        if !val.is_empty() {
            return Some(val);
        }
    }

    // 2. 检查 CLI 参数 --log-server=xxx
    for arg in std::env::args() {
        if let Some(val) = arg.strip_prefix("--log-server=") {
            let val = val.trim().to_string();
            if !val.is_empty() {
                return Some(val);
            }
        }
        if let Some(val) = arg.strip_prefix("--log_server=") {
            let val = val.trim().to_string();
            if !val.is_empty() {
                return Some(val);
            }
        }
    }

    None
}

// ====== 全局日志器 ======
pub static LOGGER: Lazy<Logger> = Lazy::new(|| {
    let log_dir = get_log_dir();
    let _ = fs::create_dir_all(&log_dir);
    let mut logger = Logger::new(log_dir.join("mytodos.log"), LEVEL_DEBUG);

    // 如果配置了远程日志服务器，添加 ConnWriter
    if let Some(addr) = resolve_log_server() {
        eprintln!("[mytodos-log] 远程日志服务器：{}", addr);
        match ConnWriter::connect(&addr) {
            Ok(cw) => {
                logger.conn = Mutex::new(Some(cw));
                eprintln!("[mytodos-log] 已连接日志服务器: {}", addr);
            }
            Err(e) => {
                eprintln!("[mytodos-log] 连接日志服务器失败: {} (程序继续运行)", e);
            }
        }
    }

    logger
});

fn get_log_dir() -> PathBuf {
    #[cfg(target_os = "android")]
    {
        return PathBuf::from("/storage/emulated/0/Download/mytodos-logs");
    }
    if let Ok(p) = std::env::var("APPDATA") {
        return PathBuf::from(p).join("mytodos").join("logs");
    }
    if let Ok(p) = std::env::var("HOME") {
        return PathBuf::from(p).join(".mytodos").join("logs");
    }
    PathBuf::from("logs")
}

// ====== TCP 远程日志写入器（ConnWriter，参考 log4go conn.go） ======
// 心跳线程标志
static HEARTBEAT_RUNNING: AtomicBool = AtomicBool::new(false);

pub struct ConnWriter {
    stream: TcpStream,
}

impl ConnWriter {
    /// 连接远程日志服务器，发送 {LogName} 握手包
    fn connect(addr: &str) -> std::io::Result<Self> {
        let addr2 = addr
            .to_socket_addrs()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidInput, e))?
            .next()
            .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::InvalidInput, "地址解析为空"))?;

        let stream = TcpStream::connect_timeout(&addr2, Duration::from_secs(5))?;
        stream.set_write_timeout(Some(Duration::from_secs(3)))?;
        stream.set_nodelay(true)?;

        // 发送 {LogName} 握手包（与 log4go connWriter.connect 一致）
        let mut s = stream.try_clone()?;
        s.write_all(b"{LogName}mytodos{LogName}\n")?;
        s.flush()?;

        // 启动心跳线程（每 5 秒发送 {HeartBeat}）
        if !HEARTBEAT_RUNNING.swap(true, Ordering::SeqCst) {
            thread::spawn(move || {
                let mut hb = s;
                loop {
                    thread::sleep(Duration::from_secs(5));
                    if hb.write_all(b"{HeartBeat}\n").is_err() {
                        break;
                    }
                    let _ = hb.flush();
                }
            });
        }

        Ok(Self { stream })
    }
}

impl LogWriter for ConnWriter {
    fn write(&mut self, msg: &str) -> std::io::Result<()> {
        // TCP 输出格式（不带 ANSI 颜色，与 log4go connWriter 一致）
        self.stream.write_all(msg.as_bytes())?;
        self.stream.flush()?;
        Ok(())
    }
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
            let stripped = msg.strip_suffix('\n').unwrap_or(msg);
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
    file: std::fs::File,
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
            let old_path = self.path.with_extension(format!("{}.log", self.today));
            let _ = self.file.flush();
            let _ = fs::rename(&self.path, &old_path);
            self.file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(&self.path)?;
            self.today = today_num;
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
    conn: Mutex<Option<ConnWriter>>,
}

impl Logger {
    fn new(log_path: PathBuf, level: u8) -> Self {
        let fw = FileWriter::new(log_path, 7).unwrap_or_else(|e| {
            panic!("无法初始化日志文件：{}", e);
        });
        Self {
            console: Mutex::new(ConsoleWriter::new(level, true)),
            file: Mutex::new(fw),
            conn: Mutex::new(None),
        }
    }

    /// 写日志（三个输出：控制台 + 文件 + TCP 远程服务器）
    pub fn write(&self, level: u8, file: &str, line: u32, func: &str, msg: &str) {
        let level = level.min(LEVEL_DEBUG);
        let now = Local::now();
        let time_str = now.format("%H:%M:%S").to_string();
        let pid = std::process::id();
        let prefix = LEVEL_PREFIX[level as usize];

        // 格式：`[PID] HH:MM:SS 文件名:行号(函数) [LEVEL]> 消息`
        // TCP 格式（与 log4go connWriter 一致，不含 PID）：`HH:MM:SS (文件名:行号) [LEVEL]> 消息`
        let log_line_fmt = format!(
            "[{}] {} {}:{}({}) {}> {}\n",
            pid, time_str, file, line, func, prefix, msg
        );
        let tcp_line = format!(
            "{} ({}:{}) {}> {}\n",
            time_str, file, line, prefix, msg
        );

        // 写文件
        if let Ok(mut f) = self.file.lock() {
            let _ = f.write(&log_line_fmt);
        }

        // 写控制台（带颜色）
        if let Ok(mut c) = self.console.lock() {
            let _ = c.write(&log_line_fmt);
        }

        // 写 TCP 远程日志服务器（无颜色，log4go 格式）
        if let Ok(mut c) = self.conn.lock() {
            if let Some(ref mut conn) = *c {
                let _ = conn.write(&tcp_line);
            }
        }
    }

    /// 写日志 — 无调用位置信息（供前端调用时使用）
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
        let tcp_line = format!(
            "{} (frontend) {}> {}\n",
            time_str, prefix, msg
        );

        if let Ok(mut f) = self.file.lock() {
            let _ = f.write(&log_line);
        }
        if let Ok(mut c) = self.console.lock() {
            let _ = c.write(&log_line);
        }
        if let Ok(mut c) = self.conn.lock() {
            if let Some(ref mut conn) = *c {
                let _ = conn.write(&tcp_line);
            }
        }
    }
}

// ====== Rust 侧宏 ======
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
#[tauri::command]
pub async fn log_frontend(level: u8, message: String) -> Result<(), String> {
    let level = level.min(LEVEL_DEBUG);
    LOGGER.write_simple(level, &message);
    Ok(())
}
