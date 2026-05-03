import { invoke } from '@tauri-apps/api/core'
import type { Platform, ReleaseInfo, UpgradeDecision } from '../types'
import { compareSemver } from '../utils/semver'

// 注：Vite 在编译期通过 define 注入；运行时若未注入则回退为 '0.0.0'。
const APP_VERSION = (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0')

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'windows'
  const ua = navigator.userAgent.toLowerCase()
  if (/android/.test(ua)) return 'android'
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/mac/.test(ua)) return 'macos'
  if (/linux/.test(ua)) return 'linux'
  return 'windows'
}

export function decideUpgrade(info: ReleaseInfo | undefined, current: string = APP_VERSION): UpgradeDecision {
  const platform = detectPlatform()
  if (!info || !info.latestVersion || !info.minSupportedVersion) {
    return { level: 'none', current, platform }
  }
  const url = info.downloadUrls?.[platform] ?? undefined
  const fileName = url ? extractFileName(url) : undefined
  if (compareSemver(current, info.minSupportedVersion) < 0) {
    return {
      level: 'force', current, platform,
      latest: info.latestVersion,
      minSupported: info.minSupportedVersion,
      url: url ?? undefined,
      fileName,
      notes: info.releaseNotes,
    }
  }
  if (compareSemver(current, info.latestVersion) < 0) {
    // 推荐升级时无 URL：静默不提示
    if (!url) return { level: 'none', current, platform }
    return {
      level: 'recommend', current, platform,
      latest: info.latestVersion,
      url,
      fileName,
      notes: info.releaseNotes,
    }
  }
  return { level: 'none', current, platform }
}

function extractFileName(url: string): string {
  try {
    const u = new URL(url)
    const last = u.pathname.split('/').filter(Boolean).pop() ?? ''
    return last || 'mytodos-installer'
  } catch {
    const last = url.split('/').filter(Boolean).pop() ?? ''
    return last || 'mytodos-installer'
  }
}

export async function downloadRelease(url: string, fileName: string): Promise<string> {
  return await invoke<string>('download_release', { url, fileName })
}

export async function cancelDownload(): Promise<void> {
  await invoke('cancel_download_release')
}

export async function openInstaller(path: string): Promise<void> {
  await invoke('open_path', { path })
}

export const APP_VERSION_CONST = APP_VERSION
