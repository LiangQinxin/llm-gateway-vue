import { defineStore } from 'pinia'

/**
 * 用户状态：保存后端登录返回的 token 与用户信息
 * persist 只持久化 token / userInfo，存储于 localStorage 的 'lgw-user' 键
 */
export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
  },

  actions: {
    setToken(token) {
      this.token = token || ''
    },
    setUserInfo(info) {
      this.userInfo = info || null
    },
    logout() {
      this.token = ''
      this.userInfo = null
    },
  },

  persist: {
    key: 'lgw-user',
    paths: ['token', 'userInfo'],
  },
})
