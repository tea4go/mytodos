// SemVer 2.0 简化比较：仅取主版本号 X.Y.Z 三段，忽略 prerelease/build metadata。
// 返回 -1 / 0 / 1
export function compareSemver(a: string, b: string): number {
  const pa = parseParts(a)
  const pb = parseParts(b)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d > 0) return 1
    if (d < 0) return -1
  }
  return 0
}

function parseParts(v: string): number[] {
  const core = (v ?? '').trim().split(/[-+]/)[0] || '0'
  return core.split('.').slice(0, 3).map(p => {
    const n = parseInt(p, 10)
    return Number.isFinite(n) ? n : 0
  })
}
