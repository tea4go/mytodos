/**
 * 前端日志服务
 *
 * 通过 Tauri invoke 调用 Rust 侧 log_frontend 命令写日志。
 * 日志文件位置：
 *   Windows: %APPDATA%/mytodos/logs/mytodos.log
 *   macOS/Linux: ~/.mytodos/logs/mytodos.log
 *   Android: /storage/emulated/0/Download/mytodos-logs/mytodos.log
 *
 * 日志级别（与 log4go 一致）：
 *   0=Emergency  1=Alert  2=Critical  3=Error
 *   4=Warning    5=Notice 6=Info       7=Debug
 */

import { invoke } from '@tauri-apps/api/core'

const LEVEL = {
  EMERGENCY: 0,
  ALERT: 1,
  CRITICAL: 2,
  ERROR: 3,
  WARNING: 4,
  NOTICE: 5,
  INFO: 6,
  DEBUG: 7,
} as const

/**
 * 写入日志（内部使用）
 * 所有级别函数都会在错误发生时先写日志再返回/抛出
 */
async function writeLog(level: number, message: string): Promise<void> {
  try {
    await invoke('log_frontend', { level, message })
  } catch {
    // 日志本身失败不阻断业务，静默 fallback 到 console
    console.error(`[LOG FAILED] [${level}] ${message}`)
  }
}

// ====== 工具：获取调用位置 ======
function callerInfo(): string {
  try {
    throw new Error()
  } catch (e: any) {
    const stack = e.stack?.split('\n') || []
    // stack[0] = "Error", stack[1] = 当前函数, stack[2] = 调用者
    for (let i = 2; i < Math.min(stack.length, 6); i++) {
      const line = stack[i]?.trim()
      if (line && !line.includes('logHelper') && !line.includes('log_helper')) {
        // 提取文件名:行号
        const match = line.match(/([^\\/]+\.(ts|vue)):(\d+)/)
        if (match) {
          return `${match[1]}:${match[2]}`
        }
        // 兼容 Vite 构建后的格式
        const match2 = line.match(/at\s+(.+?)\s+\((.+?)\)/)
        if (match2) {
          return match2[1]
        }
      }
    }
    return 'unknown'
  }
}

// ====== 对外函数 ======

export async function emergency(tag: string, message: string, ...args: any[]): Promise<void> {
  const loc = callerInfo()
  const msg = args.length > 0 ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message
  await writeLog(LEVEL.EMERGENCY, `[${tag}] ${loc} ${msg}`)
}

export async function alert(tag: string, message: string, ...args: any[]): Promise<void> {
  const loc = callerInfo()
  const msg = args.length > 0 ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message
  await writeLog(LEVEL.ALERT, `[${tag}] ${loc} ${msg}`)
}

export async function critical(tag: string, message: string, ...args: any[]): Promise<void> {
  const loc = callerInfo()
  const msg = args.length > 0 ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message
  await writeLog(LEVEL.CRITICAL, `[${tag}] ${loc} ${msg}`)
}

export async function error(tag: string, message: string, ...args: any[]): Promise<void> {
  const loc = callerInfo()
  const msg = args.length > 0 ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message
  await writeLog(LEVEL.ERROR, `[${tag}] ${loc} ${msg}`)
  // 同时也输出到前端 console
  console.error(`[ERROR] [${tag}] ${msg}`)
}

export async function warn(tag: string, message: string, ...args: any[]): Promise<void> {
  const loc = callerInfo()
  const msg = args.length > 0 ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message
  await writeLog(LEVEL.WARNING, `[${tag}] ${loc} ${msg}`)
  console.warn(`[WARN] [${tag}] ${msg}`)
}

export async function notice(tag: string, message: string, ...args: any[]): Promise<void> {
  const loc = callerInfo()
  const msg = args.length > 0 ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message
  await writeLog(LEVEL.NOTICE, `[${tag}] ${loc} ${msg}`)
}

export async function info(tag: string, message: string, ...args: any[]): Promise<void> {
  const loc = callerInfo()
  const msg = args.length > 0 ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message
  await writeLog(LEVEL.INFO, `[${tag}] ${loc} ${msg}`)
}

export async function debug(tag: string, message: string, ...args: any[]): Promise<void> {
  const loc = callerInfo()
  const msg = args.length > 0 ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message
  await writeLog(LEVEL.DEBUG, `[${tag}] ${loc} ${msg}`)
}

/**
 * 统一处理 API 错误：先写 ERROR 日志，再设置 UI 错误提示，然后抛出
 */
export async function handleApiError(
  tag: string,
  context: string,
  err: any,
  setError?: (msg: string) => void,
): Promise<never> {
  const errMsg = typeof err === 'string' ? err : err?.message || String(err)
  const fullMsg = `${context}: ${errMsg}`
  await error(tag, fullMsg)
  if (setError) {
    setError(fullMsg)
  }
  throw err
}
