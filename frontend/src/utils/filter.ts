import type { Task, TaskFilter } from '../types'
import { isSameDay, addDays, isOverdue } from './date'

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  let result = tasks

  if (filter.viewMode === 'active') {
    result = result.filter(t => t.status === 'todo' || t.status === 'doing')
  } else if (filter.viewMode === 'done') {
    result = result.filter(t => t.status === 'done')
  }

  if (filter.status !== null) {
    result = result.filter(t => t.status === filter.status)
  }

  if (filter.assigneeId !== null) {
    result = result.filter(t => t.assigneeId === filter.assigneeId)
  }

  const now = new Date()
  switch (filter.dueDate) {
    case 'today':
      result = result.filter(t => t.dueAt && isSameDay(new Date(t.dueAt), now))
      break
    case 'week':
      result = result.filter(t => t.dueAt && new Date(t.dueAt) <= addDays(now, 7))
      break
    case 'overdue':
      result = result.filter(t => t.dueAt && isOverdue(t.dueAt) && t.status !== 'done')
      break
  }

  if (filter.tagIds.length > 0) {
    result = result.filter(t => t.tagIds.some(tid => filter.tagIds.includes(tid)))
  }

  return result
}
