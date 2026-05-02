import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/guide' },
    {
      path: '/guide',
      name: 'Guide',
      component: () => import('../views/GuideView.vue'),
      meta: { roles: null as string[] | null },
    },
    {
      path: '/workspaces',
      name: 'Workspaces',
      component: () => import('../views/WorkspaceListView.vue'),
      meta: { roles: ['admin', 'parent', 'student'] },
    },
    {
      path: '/workspaces/:id/tasks',
      name: 'TaskList',
      component: () => import('../views/TaskListView.vue'),
      meta: { roles: ['parent', 'student'] },
    },
    {
      path: '/workspaces/:id/tasks/:taskId',
      name: 'TaskDetail',
      component: () => import('../views/TaskDetailView.vue'),
      meta: { roles: ['admin', 'parent', 'student'] },
    },
    {
      path: '/workspaces/:id/tags',
      name: 'TagManage',
      component: () => import('../views/TagManageView.vue'),
      meta: { roles: ['admin'] },
    },
    {
      path: '/workspaces/:id/members',
      name: 'MemberManage',
      component: () => import('../views/MemberManageView.vue'),
      meta: { roles: ['admin'] },
    },
    { path: '/:pathMatch(.*)*', redirect: '/guide' },
  ],
})

function defaultRouteForRole(role: string | null, currentWorkspaceId: string | null): string {
  if (role === 'admin') return '/workspaces'
  if ((role === 'parent' || role === 'student') && currentWorkspaceId) {
    return `/workspaces/${currentWorkspaceId}/tasks`
  }
  return '/workspaces'
}

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()
  const wsStore = useWorkspaceStore()

  if (!auth.isLoggedIn) {
    await auth.restoreSession()
  }

  if (!auth.isLoggedIn && to.name !== 'Guide') {
    return next('/guide')
  }
  if (auth.isLoggedIn && to.name === 'Guide') {
    return next(defaultRouteForRole(auth.role, wsStore.currentWorkspaceId))
  }

  const allowedRoles = to.meta.roles as string[] | null
  if (allowedRoles && auth.role && !allowedRoles.includes(auth.role)) {
    return next(defaultRouteForRole(auth.role, wsStore.currentWorkspaceId))
  }
  next()
})

export default router
