import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tag } from '../types'

export const useTagStore = defineStore('tag', () => {
  const tags = ref<Tag[]>([])

  function setTags(newTags: Tag[]) { tags.value = newTags }
  function addTag(tag: Tag) { tags.value.push(tag) }
  function updateTag(tagId: string, updates: Partial<Tag>) {
    const idx = tags.value.findIndex(t => t.tagId === tagId)
    if (idx !== -1) tags.value[idx] = { ...tags.value[idx], ...updates }
  }
  function removeTag(tagId: string) {
    tags.value = tags.value.filter(t => t.tagId !== tagId)
  }

  return { tags, setTags, addTag, updateTag, removeTag }
})
