import type { Task } from '../types'

export function sortTasks(tasks: Task[]): Task[] {
  const now = new Date()
  return [...tasks].sort((a, b) => {
    const aOver = a.dueAt && new Date(a.dueAt) < now ? 0 : 1
    const bOver = b.dueAt && new Date(b.dueAt) < now ? 0 : 1
    if (aOver !== bOver) return aOver - bOver
    if (a.dueAt && b.dueAt) {
      const cmp = new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
      if (cmp !== 0) return cmp
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}
