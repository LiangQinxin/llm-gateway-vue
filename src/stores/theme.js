import { defineStore } from 'pinia'

// 主题管理（light / dark）
export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: localStorage.getItem('lgw-theme') || 'light',
  }),

  actions: {
    apply() {
      document.documentElement.setAttribute('data-theme', this.mode)
    },
    toggle() {
      this.mode = this.mode === 'light' ? 'dark' : 'light'
      localStorage.setItem('lgw-theme', this.mode)
      this.apply()
    },
  },
})
