import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
      { path: 'channels', name: 'channels', component: () => import('@/views/ChannelsView.vue') },
      { path: 'apikeys', name: 'apikeys', component: () => import('@/views/ApiKeysView.vue') },
      { path: 'logs', name: 'logs', component: () => import('@/views/LogsView.vue') },
      { path: 'security', name: 'security', component: () => import('@/views/SecurityView.vue') },
      { path: 'usage', name: 'usage', component: () => import('@/views/UsageView.vue') },
    ],
  },
  // 未匹配路由兜底
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 登录守卫：无 token 访问受保护页 → /login；已登录访问 /login → /dashboard
router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.meta.public) {
    if (userStore.token) return '/dashboard'
    return true
  }
  if (!userStore.token) return '/login'
  return true
})

export default router
