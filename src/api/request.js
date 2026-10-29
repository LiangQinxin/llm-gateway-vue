import axios from 'axios'
import { useUserStore } from '@/stores/user'

/**
 * Axios 统一封装
 * - baseURL: /api （最终请求 /api/v1/xxx）
 * - 请求拦截器：除登录接口外，自动携带 Authorization: Bearer <token>
 * - 响应处理：成功返回完整响应体 { code, data, info }，由调用方检查 code === '0000'
 *            失败返回 { code: 'ERR', info }
 */
const gateway = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截：自动注入令牌（登录请求除外）
gateway.interceptors.request.use(
  (config) => {
    const isLogin = typeof config.url === 'string' && config.url.includes('/login')
    if (!isLogin) {
      const userStore = useUserStore()
      if (userStore.token) {
        config.headers.Authorization = `Bearer ${userStore.token}`
      }
    }
    return config
  },
  (error) => Promise.resolve({ code: 'ERR', info: error.message || '请求异常' }),
)

// 响应拦截：统一返回响应体 / 错误结构
gateway.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    const body = error.response?.data
    const info = body?.info || (status ? `请求失败 (${status})` : `网络错误：${error.message}`)
    return Promise.resolve({ code: 'ERR', info })
  },
)

export default gateway
