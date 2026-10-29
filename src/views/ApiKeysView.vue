<script setup>
import { onMounted, reactive, ref } from 'vue'
import { fetchApiKeys, createApiKey, updateApiKey, deleteApiKey, setApiKeyStatus } from '@/api/gateway'
import { escapeHtml, formatDate, generateKey } from '@/utils/format'
import { notify } from '@/utils/toast'
import { confirmAction } from '@/utils/dialog'
import AppIcon from '@/components/AppIcon.vue'
import ModalBox from '@/components/ModalBox.vue'

const loading = ref(false)
const keys = ref([])
const visibleMap = ref({})

// 弹窗状态
const dialogOpen = ref(false)
const editingId = ref('')
const form = reactive({
  name: '',
  key: '',
  quotaLimit: 0,
})

function keyId(k) {
  return k.id || k.keyId || ''
}
function keyValue(k) {
  return k.key || k.apiKey || ''
}

async function loadApiKeys() {
  loading.value = true
  const r = await fetchApiKeys()
  if (r.code === '0000') keys.value = r.data || []
  else notify(r.info || '加载失败', 'error')
  loading.value = false
}

function openCreate() {
  editingId.value = ''
  form.name = ''
  form.key = 'sk-llmapi-' + generateKey()
  form.quotaLimit = 0
  dialogOpen.value = true
}

function openEdit(id) {
  const k = keys.value.find((x) => keyId(x) === id)
  if (!k) return
  editingId.value = id
  form.name = k.name || ''
  form.key = ''
  form.quotaLimit = k.quotaLimit || 0
  dialogOpen.value = true
}

function refreshGeneratedKey() {
  form.key = 'sk-llmapi-' + generateKey()
}

async function saveKey() {
  const body = { name: form.name, status: 1, quotaLimit: +form.quotaLimit || 0 }
  if (!body.name) {
    notify('请输入密钥名称', 'error')
    return
  }
  if (!editingId.value) body.key = form.key
  const r = editingId.value
    ? await updateApiKey(editingId.value, body)
    : await createApiKey(body)
  if (r.code === '0000') {
    notify(editingId.value ? '密钥更新成功' : '密钥添加成功')
    dialogOpen.value = false
    loadApiKeys()
  } else {
    notify(r.info || '操作失败', 'error')
  }
}

function removeKey(id) {
  const k = keys.value.find((x) => keyId(x) === id)
  confirmAction({
    title: '确认删除',
    body: `确定要删除密钥 <strong>${escapeHtml(k?.name || '')}</strong> 吗？`,
    onOk: async () => {
      const r = await deleteApiKey(id)
      if (r.code === '0000') {
        notify('密钥已删除')
        loadApiKeys()
      } else {
        notify(r.info || '删除失败', 'error')
      }
    },
  })
}

async function toggleKeyStatus(id, current) {
  const r = await setApiKeyStatus(id, current === 1 ? 0 : 1)
  if (r.code === '0000') {
    notify(current === 1 ? '密钥已禁用' : '密钥已启用')
    loadApiKeys()
  } else {
    notify(r.info || '操作失败', 'error')
  }
}

function toggleVisible(id) {
  visibleMap.value = { ...visibleMap.value, [id]: !visibleMap.value[id] }
}

async function copyKey(k) {
  const val = keyValue(k)
  if (!val) return
  try {
    await navigator.clipboard.writeText(val)
    notify('密钥已复制到剪贴板')
  } catch {
    notify('复制失败，请手动复制', 'error')
  }
}

// 额度颜色
function quotaColor(pct) {
  if (pct >= 90) return '#dc4c64'
  if (pct >= 70) return '#c48a21'
  return 'var(--lgw-primary)'
}

onMounted(loadApiKeys)
</script>

<template>
  <div class="lgw-page">
    <div class="lgw-page-head">
      <div>
        <div class="lgw-page-title">API 密钥</div>
        <div class="lgw-page-sub">管理对外提供的 API 密钥 · 额度控制</div>
      </div>
      <div class="lgw-page-actions">
        <button class="lgw-btn lgw-btn--soft lgw-btn--sm" :disabled="loading" @click="loadApiKeys()">
          <AppIcon name="refresh" :class="{ 'lgw-spin': loading }" /> {{ loading ? '刷新中...' : '刷新' }}
        </button>
        <button class="lgw-btn lgw-btn--primary" @click="openCreate()">
          <AppIcon name="plus" /> 添加密钥
        </button>
      </div>
    </div>

    <div class="lgw-panel" style="overflow: hidden">
      <div class="lgw-table-wrap">
        <table class="lgw-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>密钥</th>
              <th>状态</th>
              <th>额度使用</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="k in keys" :key="keyId(k)">
              <td style="font-weight: 600">{{ k.name }}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 6px">
                  <span style="font-family: monospace; font-size: 12px">
                    {{ visibleMap[keyId(k)] ? keyValue(k) : '••••••••' + keyValue(k).slice(-4) }}
                  </span>
                  <button
                    class="lgw-btn lgw-btn--soft lgw-btn--sm lgw-btn--icon"
                    :title="visibleMap[keyId(k)] ? '隐藏' : '显示'"
                    @click="toggleVisible(keyId(k))"
                  >
                    <AppIcon :name="visibleMap[keyId(k)] ? 'eyeOff' : 'eye'" />
                  </button>
                  <button
                    class="lgw-btn lgw-btn--soft lgw-btn--sm lgw-btn--icon"
                    title="复制密钥"
                    @click="copyKey(k)"
                  >
                    <AppIcon name="copy" />
                  </button>
                </div>
              </td>
              <td>
                <div
                  class="lgw-switch"
                  :class="{ on: k.status === 1 }"
                  :title="k.status === 1 ? '点击禁用' : '点击启用'"
                  @click="toggleKeyStatus(keyId(k), k.status)"
                >
                  <div class="lgw-switch-knob" />
                </div>
              </td>
              <td style="text-align: left">
                <div style="display: flex; align-items: center; gap: 10px; justify-content: flex-start">
                  <div class="lgw-progress" style="width: 90px">
                    <div
                      class="lgw-progress-fill"
                      :style="{
                        width: (k.quotaLimit > 0 ? Math.min((k.quotaUsed || 0) / k.quotaLimit * 100, 100) : 0) + '%',
                        background: quotaColor(k.quotaLimit > 0 ? (k.quotaUsed || 0) / k.quotaLimit * 100 : 0),
                      }"
                    />
                  </div>
                  <span style="font-size: 11px; color: var(--lgw-muted-fg); font-variant-numeric: tabular-nums; white-space: nowrap">
                    {{ k.quotaUsed || 0 }}/{{ k.quotaLimit === 0 ? '∞' : k.quotaLimit }}
                  </span>
                </div>
              </td>
              <td style="color: var(--lgw-muted-fg); font-size: 12px">{{ formatDate(k.createdAt) }}</td>
              <td>
                <div class="lgw-row-actions">
                  <button class="lgw-btn lgw-btn--soft lgw-btn--sm lgw-btn--icon" title="编辑" @click="openEdit(keyId(k))">
                    <AppIcon name="edit" />
                  </button>
                  <button class="lgw-btn lgw-btn--danger lgw-btn--sm lgw-btn--icon" title="删除" @click="removeKey(keyId(k))">
                    <AppIcon name="trash" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!keys.length">
              <td colspan="6">
                <div class="lgw-empty">
                  <AppIcon name="empty" :size="32" />
                  <div class="lgw-empty-title">暂无密钥</div>
                  <div class="lgw-empty-desc">点击右上角添加密钥</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 添加 / 编辑弹窗 -->
    <ModalBox :open="dialogOpen" :title="editingId ? '编辑密钥' : '添加密钥'" @close="dialogOpen = false">
      <div class="lgw-field">
        <label class="lgw-field-label">密钥名称</label>
        <input v-model="form.name" class="lgw-input" placeholder="如：测试密钥" />
      </div>
      <div v-if="!editingId" class="lgw-field">
        <label class="lgw-field-label">密钥</label>
        <div style="display: flex; gap: 8px; align-items: center">
          <input v-model="form.key" class="lgw-input" readonly style="font-family: monospace; flex: 1; background: var(--lgw-slate)" />
          <button class="lgw-btn lgw-btn--soft lgw-btn--sm" title="重新生成" @click="refreshGeneratedKey()">
            <AppIcon name="refresh" />
          </button>
        </div>
        <div class="lgw-field-hint">系统自动生成，可点击刷新重新生成</div>
      </div>
      <div class="lgw-field">
        <label class="lgw-field-label">额度限制</label>
        <input v-model.number="form.quotaLimit" class="lgw-input" type="number" placeholder="0" />
        <div class="lgw-field-hint">0 表示无限制</div>
      </div>
      <template #footer>
        <button class="lgw-btn lgw-btn--soft" @click="dialogOpen = false">取消</button>
        <button class="lgw-btn lgw-btn--primary" @click="saveKey()">确认</button>
      </template>
    </ModalBox>
  </div>
</template>

<style scoped>
.lgw-table th,
.lgw-table td {
  text-align: center;
}
.lgw-table td > div {
  margin-inline: auto;
}
.lgw-table td > div[style*="flex"] {
  justify-content: center;
}
</style>
