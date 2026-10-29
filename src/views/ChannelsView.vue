<script setup>
import { onMounted, reactive, ref } from 'vue'
import {
  fetchChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  testChannel,
  setChannelStatus,
} from '@/api/gateway'
import { escapeHtml } from '@/utils/format'
import { notify } from '@/utils/toast'
import { confirmAction } from '@/utils/dialog'
import AppIcon from '@/components/AppIcon.vue'
import ModalBox from '@/components/ModalBox.vue'

const loading = ref(false)
const channels = ref([])

// 弹窗状态
const dialogOpen = ref(false)
const editingId = ref('')
const form = reactive({
  name: '',
  type: 'openai',
  baseUrl: '',
  apiKey: '',
  models: '',
  priority: 0,
  weight: 1,
})

const typeOptions = ['openai', 'deepseek', 'anthropic', 'gemini', 'qwen', 'zhipu', 'moonshot', 'doubao', 'ollama', 'custom']

async function loadChannels() {
  loading.value = true
  const r = await fetchChannels()
  if (r.code === '0000') channels.value = r.data || []
  else notify(r.info || '加载失败', 'error')
  loading.value = false
}

function openCreate() {
  editingId.value = ''
  Object.assign(form, {
    name: '',
    type: 'openai',
    baseUrl: '',
    apiKey: '',
    models: '',
    priority: 0,
    weight: 1,
  })
  dialogOpen.value = true
}

function openEdit(id) {
  const ch = channels.value.find((c) => c.id === id)
  if (!ch) return
  editingId.value = id
  Object.assign(form, {
    name: ch.name || '',
    type: ch.type || 'openai',
    baseUrl: ch.baseUrl || '',
    apiKey: ch.apiKey || '',
    models: (ch.models || []).join(', '),
    priority: ch.priority ?? 0,
    weight: ch.weight ?? 1,
  })
  dialogOpen.value = true
}

async function saveChannel() {
  const body = {
    name: form.name,
    type: form.type,
    baseUrl: form.baseUrl,
    apiKey: form.apiKey,
    models: form.models.split(',').map((s) => s.trim()).filter(Boolean),
    priority: +form.priority,
    weight: +form.weight,
    status: 1,
  }
  if (!body.name) {
    notify('请输入渠道名称', 'error')
    return
  }
  const r = editingId.value
    ? await updateChannel(editingId.value, body)
    : await createChannel(body)
  if (r.code === '0000') {
    notify(editingId.value ? '渠道更新成功' : '渠道添加成功')
    dialogOpen.value = false
    loadChannels()
  } else {
    notify(r.info || '操作失败', 'error')
  }
}

function removeChannel(id) {
  const ch = channels.value.find((c) => c.id === id)
  confirmAction({
    title: '确认删除',
    body: `确定要删除渠道 <strong>${escapeHtml(ch?.name || '')}</strong> 吗？`,
    onOk: async () => {
      const r = await deleteChannel(id)
      if (r.code === '0000') {
        notify('渠道已删除')
        loadChannels()
      } else {
        notify(r.info || '删除失败', 'error')
      }
    },
  })
}

async function doTest(id) {
  notify('正在测试渠道连通性...', 'info')
  const r = await testChannel(id)
  if (r.code === '0000') notify('渠道测试成功，连接正常')
  else notify(r.info || '测试失败', 'error')
}

async function toggleStatus(id, current) {
  const next = current === 1 ? 0 : 1
  const r = await setChannelStatus(id, next)
  if (r.code === '0000') {
    notify(next === 1 ? '渠道已启用' : '渠道已禁用')
    loadChannels()
  } else {
    notify(r.info || '操作失败', 'error')
  }
}

onMounted(loadChannels)
</script>

<template>
  <div class="lgw-page">
    <div class="lgw-page-head">
      <div>
        <div class="lgw-page-title">渠道管理</div>
        <div class="lgw-page-sub">配置 LLM 供应商渠道 · 负载均衡 · 故障转移</div>
      </div>
      <div class="lgw-page-actions">
        <button class="lgw-btn lgw-btn--soft lgw-btn--sm" :disabled="loading" @click="loadChannels()">
          <AppIcon name="refresh" :class="{ 'lgw-spin': loading }" /> {{ loading ? '刷新中...' : '刷新' }}
        </button>
        <button class="lgw-btn lgw-btn--primary" @click="openCreate()">
          <AppIcon name="plus" /> 添加渠道
        </button>
      </div>
    </div>

    <div class="lgw-panel" style="overflow: hidden">
      <div class="lgw-table-wrap">
        <table class="lgw-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>类型</th>
              <th>Base URL</th>
              <th>模型</th>
              <th>优先级</th>
              <th>权重</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ch in channels" :key="ch.id">
              <td style="font-weight: 600">{{ ch.name }}</td>
              <td><span class="lgw-tag lgw-tag--blue">{{ ch.type }}</span></td>
              <td>
                <span class="ch-url" :title="ch.baseUrl || ''">{{ ch.baseUrl || '-' }}</span>
              </td>
              <td>
                <div class="ch-models">
                  <template v-for="m in (ch.models || []).slice(0, 3)" :key="m">
                    <span class="lgw-chip">{{ m }}</span>
                  </template>
                  <span v-if="(ch.models || []).length > 3" class="lgw-chip" :title="(ch.models || []).join(', ')">
                    +{{ ch.models.length - 3 }}
                  </span>
                  <span v-if="!(ch.models || []).length">-</span>
                </div>
              </td>
              <td style="font-variant-numeric: tabular-nums">{{ ch.priority ?? 0 }}</td>
              <td style="font-variant-numeric: tabular-nums">{{ ch.weight ?? 1 }}</td>
              <td>
                <div
                  class="lgw-switch"
                  :class="{ on: ch.status === 1 }"
                  :title="ch.status === 1 ? '点击禁用' : '点击启用'"
                  @click="toggleStatus(ch.id, ch.status)"
                >
                  <div class="lgw-switch-knob" />
                </div>
              </td>
              <td>
                <div class="lgw-row-actions">
                  <button class="lgw-btn lgw-btn--soft lgw-btn--sm lgw-btn--icon" title="测试连接" @click="doTest(ch.id)">
                    <AppIcon name="test" />
                  </button>
                  <button class="lgw-btn lgw-btn--soft lgw-btn--sm lgw-btn--icon" title="编辑" @click="openEdit(ch.id)">
                    <AppIcon name="edit" />
                  </button>
                  <button class="lgw-btn lgw-btn--danger lgw-btn--sm lgw-btn--icon" title="删除" @click="removeChannel(ch.id)">
                    <AppIcon name="trash" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!channels.length">
              <td colspan="8">
                <div class="lgw-empty">
                  <AppIcon name="empty" :size="32" />
                  <div class="lgw-empty-title">暂无渠道</div>
                  <div class="lgw-empty-desc">点击右上角添加渠道</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 添加 / 编辑弹窗 -->
    <ModalBox :open="dialogOpen" :title="editingId ? '编辑渠道' : '添加渠道'" @close="dialogOpen = false">
      <div class="lgw-field">
        <label class="lgw-field-label">渠道名称</label>
        <input v-model="form.name" class="lgw-input" placeholder="如：OpenAI 官方" />
      </div>
      <div class="lgw-field">
        <label class="lgw-field-label">渠道类型</label>
        <select v-model="form.type" class="lgw-input">
          <option v-for="t in typeOptions" :key="t" :value="t">
            {{ t.charAt(0).toUpperCase() + t.slice(1) }}
          </option>
        </select>
      </div>
      <div class="lgw-field">
        <label class="lgw-field-label">Base URL</label>
        <input v-model="form.baseUrl" class="lgw-input" placeholder="https://api.openai.com/v1" />
      </div>
      <div class="lgw-field">
        <label class="lgw-field-label">API Key</label>
        <input v-model="form.apiKey" class="lgw-input" type="password" placeholder="sk-..." />
        <div class="lgw-field-hint">供应商密钥，加密存储</div>
      </div>
      <div class="lgw-field">
        <label class="lgw-field-label">模型列表</label>
        <input v-model="form.models" class="lgw-input" placeholder="gpt-4o, gpt-4o-mini" />
        <div class="lgw-field-hint">逗号分隔多个模型</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
        <div class="lgw-field">
          <label class="lgw-field-label">优先级</label>
          <input v-model.number="form.priority" class="lgw-input" type="number" />
          <div class="lgw-field-hint">数字越大越优先</div>
        </div>
        <div class="lgw-field">
          <label class="lgw-field-label">权重</label>
          <input v-model.number="form.weight" class="lgw-input" type="number" />
          <div class="lgw-field-hint">同优先级负载分配</div>
        </div>
      </div>
      <template #footer>
        <button class="lgw-btn lgw-btn--soft" @click="dialogOpen = false">取消</button>
        <button class="lgw-btn lgw-btn--primary" @click="saveChannel()">确认</button>
      </template>
    </ModalBox>
  </div>
</template>

<style scoped>
.ch-url {
  font-size: 12px;
  color: var(--lgw-muted-fg);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: bottom;
}
.ch-models {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  max-width: 220px;
  justify-content: center;
}
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
