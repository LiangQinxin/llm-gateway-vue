import { reactive } from 'vue'

// 全局确认弹窗状态（删除等危险操作）
export const confirmState = reactive({
  open: false,
  title: '确认操作',
  body: '',
  onOk: null,
})

export function confirmAction({ title = '确认操作', body = '', onOk = null }) {
  confirmState.title = title
  confirmState.body = body
  confirmState.onOk = onOk
  confirmState.open = true
}

export function closeConfirm() {
  confirmState.open = false
  confirmState.onOk = null
}
