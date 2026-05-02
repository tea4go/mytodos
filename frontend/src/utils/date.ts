export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function addDays(date: Date, days: number): Date {
  const r = new Date(date)
  r.setDate(r.getDate() + days)
  return r
}

export function isOverdue(dueAt: string): boolean {
  return new Date(dueAt) < new Date()
}

export function formatDateTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hh}:${mm}`
}
