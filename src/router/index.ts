import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/guide'
    },
    {
      path: '/guide',
      name: 'Guide',
      component: () => import('../views/GuideView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/guide'
    }
  ]
})

export default router
