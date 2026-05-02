import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

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

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()
  if (!auth.isLoggedIn) {
    await auth.restoreSession()
  }

  if (!auth.isLoggedIn && to.name !== 'Guide') {
    return next('/guide')
  }
  if (auth.isLoggedIn && to.name === 'Guide') {
    return next('/workspaces')
  }

  const allowedRoles = to.meta.roles as string[] | null
  if (allowedRoles && auth.role && !allowedRoles.includes(auth.role)) {
    return next('/workspaces')
  }
  next()
})

export default router
