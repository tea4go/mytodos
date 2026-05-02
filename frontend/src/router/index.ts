import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceStore } from '../stores/workspace'
import { loadGlobal } from '../services/sync'

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
      meta: { roles: null as string[] | null },
    },
    {
      path: '/workspaces/:id/login',
      name: 'WorkspaceLogin',
      component: () => import('../views/WorkspaceLoginView.vue'),
      meta: { roles: null as string[] | null },
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
    {
      path: '/workspaces/:id/settings',
      name: 'WorkspaceSettings',
      component: () => import('../views/WorkspaceSettingsView.vue'),
      meta: { roles: ['admin'] },
    },
    {
      path: '/workspaces/:id/admin',
      name: 'AdminHome',
      component: () => import('../views/AdminHomeView.vue'),
      meta: { roles: ['admin'] },
    },
    { path: '/:pathMatch(.*)*', redirect: '/guide' },
  ],
})

/** 当前角色已登录后的默认目标页。 */
function defaultRouteForRole(role: string | null, currentWorkspaceId: string | null): string {
  if (role === 'admin' && currentWorkspaceId) return `/workspaces/${currentWorkspaceId}/admin`
  if (role === 'admin') return '/workspaces'
  if ((role === 'parent' || role === 'student') && currentWorkspaceId) {
    return `/workspaces/${currentWorkspaceId}/tasks`
  }
  return '/workspaces'
}

/** 未登录时的默认入口（直接进全局登录页）。 */
function defaultUnauthedRoute(): string {
  return '/guide'
}

/** 允许在未登录状态访问的路由名。 */
const PUBLIC_ROUTES = new Set(['Guide', 'Workspaces', 'WorkspaceLogin'])

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()
  const wsStore = useWorkspaceStore()

  if (!auth.isLoggedIn) {
    await auth.restoreSession()
  }
  wsStore.restoreWorkspace()
  // 启动时拉取一次全局配置（工作区列表/成员/标签）。失败时仍允许进入页面，由各页提示。
  if (!wsStore.global) {
    try { await loadGlobal() } catch { /* error 已通过 ui store 提示 */ }
  }

  if (!auth.isLoggedIn) {
    if (to.name && PUBLIC_ROUTES.has(String(to.name))) {
      return next()
    }
    return next(defaultUnauthedRoute())
  }

  // 已登录访问引导页 → 跳角色默认页
  if (to.name === 'Guide') {
    return next(defaultRouteForRole(auth.role, wsStore.currentWorkspaceId))
  }

  const allowedRoles = to.meta.roles as string[] | null
  if (allowedRoles && auth.role && !allowedRoles.includes(auth.role)) {
    return next(defaultRouteForRole(auth.role, wsStore.currentWorkspaceId))
  }
  next()
})

export default router
