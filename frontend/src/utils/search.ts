import type { Task } from '../types'

export function searchTasks(tasks: Task[], keyword: string): Task[] {
  const kw = keyword.toLowerCase().trim()
  if (!kw) return tasks
  return tasks.filter(t =>
    t.title.toLowerCase().includes(kw) ||
    (t.description && t.description.toLowerCase().includes(kw))
  )
}
