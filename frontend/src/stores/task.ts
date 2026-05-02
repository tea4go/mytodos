import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, TaskFilter } from '../types'
import { sortTasks } from '../utils/sort'
import { filterTasks } from '../utils/filter'
import { searchTasks } from '../utils/search'
import { useAuthStore } from './auth'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const filter = ref<TaskFilter>({
    status: 'todo',
    assigneeId: null,
    dueDate: 'today',
    tagIds: [],
    viewMode: 'active',
  })
  const searchKeyword = ref('')

  function setTasks(newTasks: Task[]) { tasks.value = newTasks }
  function addTask(task: Task) { tasks.value.push(task) }
  function updateTask(taskId: string, updates: Partial<Task>) {
    const idx = tasks.value.findIndex(t => t.taskId === taskId)
    if (idx !== -1) {
      tasks.value[idx] = { ...tasks.value[idx], ...updates }
    }
  }
  function removeTask(taskId: string) {
    tasks.value = tasks.value.filter(t => t.taskId !== taskId)
  }

  const filteredTasks = computed(() => {
    const auth = useAuthStore()
    let result = tasks.value.filter(t => !t.deletedAt)
    if (auth.role === 'student') {
      result = result.filter(t => t.assigneeId === auth.currentMemberId)
    }
    result = filterTasks(result, filter.value)
    result = searchTasks(result, searchKeyword.value)
    return sortTasks(result)
  })

  return { tasks, filter, searchKeyword, setTasks, addTask, updateTask, removeTask, filteredTasks }
})
