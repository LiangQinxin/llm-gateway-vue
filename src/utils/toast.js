import { reactive } from 'vue'

// 全局通知队列
export const toastList = reactive([])

let seq = 0

export function notify(msg, type = 'success') {
  const id = ++seq
  toastList.push({ id, msg, type })
  setTimeout(() => {
    const idx = toastList.findIndex((t) => t.id === id)
    if (idx > -1) toastList.splice(idx, 1)
  }, 3000)
}
