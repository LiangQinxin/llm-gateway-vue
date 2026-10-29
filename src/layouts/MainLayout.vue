<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { logout } from '@/api/gateway'
import { notify } from '@/utils/toast'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()

// 移动端侧边栏
const sideOpen = ref(false)
function closeSidebar() {
  sideOpen.value = false
}

// 服务运行状态
const running = ref(false)
const baseUrlText = ref('等待服务启动')
let timer = null

async function probeStatus() {
  try {
    const res = await fetch('/api/v1/health', { headers: { 'Content-Type': 'application/json' } })
    running.value = res.ok
    if (res.ok) {
      baseUrlText.value = import.meta.env.VITE_PUBLIC_BASE_URL || location.protocol + '//' + location.host + '/v1'
    }
  } catch {
    running.value = false
  }
}

// 导航菜单
const navGroups = [
  {
    label: '核心',
    items: [
      { id: 'dashboard', label: '仪表盘', icon: 'dashboard' },
      { id: 'channels', label: '渠道管理', icon: 'channels' },
      { id: 'apikeys', label: 'API 密钥', icon: 'keys' },
    ],
  },
  {
    label: '运维',
    items: [
      { id: 'logs', label: '请求日志', icon: 'logs' },
      { id: 'security', label: '安全审计', icon: 'security' },
      { id: 'usage', label: '接入示例', icon: 'usage' },
    ],
  },
]

async function doLogout() {
  try {
    await logout()
  } catch {
    // 忽略退出接口异常，本地仍清除登录态
  }
  userStore.logout()
  notify('已退出登录')
  router.push('/login')
}

onMounted(() => {
  probeStatus()
  timer = setInterval(probeStatus, 5000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="lgw-app">
    <button class="lgw-menu-btn" aria-label="菜单" @click="sideOpen = !sideOpen">
      <AppIcon name="menu" :size="20" />
    </button>

    <aside class="lgw-side" :class="{ open: sideOpen }">
      <div class="lgw-logo-wrap">
        <div class="lgw-logo">
          <div class="lgw-logo-mark">L</div>
          <div style="min-width: 0; flex: 1">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
              <h1>LLMAPI</h1>
              <button
                class="lgw-btn lgw-btn--ghost lgw-btn--icon"
                style="width: 30px; height: 30px"
                title="切换主题"
                @click="themeStore.toggle()"
              >
                <AppIcon :name="themeStore.mode === 'dark' ? 'sun' : 'moon'" :size="15" />
              </button>
            </div>
            <div class="lgw-status-row">
              <span class="lgw-status-dot" :class="running ? 'on' : 'off'" />
              <span>{{ running ? '运行中' : '未启动' }}</span>
            </div>
          </div>
        </div>
      </div>

      <nav class="lgw-nav">
        <template v-for="group in navGroups" :key="group.label">
          <RouterLink
            v-for="item in group.items"
            :key="item.id"
            :to="'/' + item.id"
            class="lgw-nav-item"
            :class="{ active: route.path === '/' + item.id }"
            @click="closeSidebar()"
          >
            <span class="lgw-nav-icon"><AppIcon :name="item.icon" /></span>
            <span>{{ item.label }}</span>
          </RouterLink>
        </template>
      </nav>

      <div class="lgw-side-foot">
        <div class="lgw-srv-box">
          <AppIcon name="server" :size="14" :style="{ color: running ? '#10b981' : '#f43f5e' }" />
          <div style="min-width: 0; flex: 1">
            <div style="margin-bottom: 4px">API BaseUrl 地址</div>
            <code>{{ baseUrlText }}</code>
          </div>
        </div>
        <button class="lgw-btn lgw-btn--soft" style="width: 100%" @click="doLogout()">
          <AppIcon name="logout" :size="15" /> 退出登录
        </button>
      </div>
    </aside>

    <div class="lgw-mobile-backdrop" :class="{ show: sideOpen }" @click="closeSidebar()" />

    <main class="lgw-main">
      <div class="lgw-scroll">
        <RouterView />
      </div>
    </main>
  </div>
</template>
