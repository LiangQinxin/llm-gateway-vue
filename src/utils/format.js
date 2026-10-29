// 通用格式化与工具函数

// HTML 转义
export function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 日期格式化：full=true 显示完整日期时间，否则 月/日 时:分
export function formatDate(d, full) {
  if (!d) return '-'
  try {
    const dt = new Date(d)
    if (full) return dt.toLocaleString('zh-CN')
    return dt.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return d
  }
}

// 时间格式化 时:分:秒
export function formatTime(d) {
  if (!d) return '--'
  try {
    return new Date(d).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '--'
  }
}

// 大数字缩写：1234 -> 1.2K
export function compactNumber(n) {
  if (n == null) return 0
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n
}

// 字节格式化
export function formatBytes(n) {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return n.toFixed(n < 10 && i > 0 ? 1 : 0) + ' ' + units[i]
}

// 相对时间：x秒前 / x分钟前 ...
export function relativeTime(d) {
  if (!d) return '-'
  const now = Date.now()
  const t = new Date(d).getTime()
  const s = Math.floor((now - t) / 1000)
  if (s < 60) return s + '秒前'
  if (s < 3600) return Math.floor(s / 60) + '分钟前'
  if (s < 86400) return Math.floor(s / 3600) + '小时前'
  return Math.floor(s / 86400) + '天前'
}

// 生成 32 位随机密钥
export function generateKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * 36)]).join('')
}

// JSON 美化
export function prettyJson(str) {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

// 文本截断
export function truncateText(s, n) {
  s = s || ''
  return s.length > n ? s.substring(0, n) + '...' : s
}

// 复制到剪贴板
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

// 从登录响应中提取 token（兼容多种返回结构：data.token / token / data.accessToken ...）
export function extractToken(payload) {
  if (!payload || typeof payload !== 'object') return ''
  const candidates = [
    payload.token,
    payload.data?.token,
    payload.data?.accessToken,
    payload.data?.access_token,
    payload.accessToken,
    payload.access_token,
    payload.data?.data?.token,
    payload.jwt,
    payload.data?.jwt,
  ]
  return candidates.find((c) => typeof c === 'string' && c.length > 0) || ''
}
