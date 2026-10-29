<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  fetchBuiltinRules,
  fetchCustomRules,
  fetchFindings,
  updateBuiltinRule,
  createCustomRule,
  updateCustomRule,
  deleteCustomRule,
  deleteFinding,
  clearFindings,
} from '@/api/gateway'
import { escapeHtml, formatDate } from '@/utils/format'
import { notify } from '@/utils/toast'
import { confirmAction } from '@/utils/dialog'
import AppIcon from '@/components/AppIcon.vue'
import ModalBox from '@/components/ModalBox.vue'

const builtin = ref([])
const custom = ref([])
const findings = ref([])

const loading = ref(false)

// 安全策略开关（本地 UI，切换提示后端支持）
const policies = ref([
  { key: 'audit', label: '安全审计总开关', on: true },
  { key: 'unicode', label: 'Unicode 混淆扫描', on: true },
  { key: 'network', label: '网络请求扫描', on: true },
  { key: 'tool', label: '工具调用风险扫描', on: true },
  { key: 'response', label: '响应内容扫描', on: true },
  { key: 'mask', label: '密钥自动脱敏', on: true },
])

const enabledCount = computed(() => builtin.value.filter((r) => r.enabled).length)
const highFindings = computed(() => findings.value.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length)

// 规则弹窗
const dialogOpen = ref(false)
// 自定义规则编辑中的 id（null=新增模式）
const editingCustomId = ref(null)
const ruleForm = reactive({
  name: '',
  ruleType: 'blacklist',
  category: 'keyword',
  pattern: '',
  severity: 'LOW',
  action: '',
})

// 内置规则编辑弹窗（仅改 action）
const builtinDialogOpen = ref(false)
const builtinEditing = reactive({ id: null, name: '', action: '' })

function severityTag(s) {
  if (s === 'CRITICAL') return 'lgw-tag--red'
  if (s === 'HIGH') return 'lgw-tag--amber'
  if (s === 'MEDIUM') return 'lgw-tag--blue'
  return 'lgw-tag--slate'
}

async function loadSecurity() {
  loading.value = true
  const [b, c, f] = await Promise.all([fetchBuiltinRules(), fetchCustomRules(), fetchFindings()])
  if (b.code === '0000') builtin.value = b.data || []
  if (c.code === '0000') custom.value = c.data || []
  if (f.code === '0000') findings.value = f.data || []
  loading.value = false
}

async function toggleRule(id, enabled) {
  const r = await updateBuiltinRule(id, { enabled })
  if (r.code === '0000') {
    notify('规则已更新')
    loadSecurity()
  } else {
    notify(r.info || '操作失败', 'error')
  }
}

function openRuleModal(rule) {
  if (rule) {
    // 编辑模式：回填
    editingCustomId.value = rule.id
    Object.assign(ruleForm, {
      name: rule.name || '',
      ruleType: rule.ruleType || rule.type || 'blacklist',
      category: rule.category || 'keyword',
      pattern: rule.pattern || '',
      severity: rule.severity || 'LOW',
      action: rule.action || '',
    })
  } else {
    // 新增模式
    editingCustomId.value = null
    Object.assign(ruleForm, { name: '', ruleType: 'blacklist', category: 'keyword', pattern: '', severity: 'LOW', action: '' })
  }
  dialogOpen.value = true
}

async function addRule() {
  const body = {
    name: ruleForm.name,
    ruleType: ruleForm.ruleType,
    category: ruleForm.category,
    pattern: ruleForm.pattern,
    severity: ruleForm.severity,
    action: ruleForm.action,
    enabled: true,
  }
  if (!body.name || !body.pattern) {
    notify('请填写完整', 'error')
    return
  }
  let r
  if (editingCustomId.value) {
    // 编辑模式：后端 PUT 只接受 pattern/severity/action/description
    r = await updateCustomRule(editingCustomId.value, {
      pattern: body.pattern,
      severity: body.severity,
      action: body.action,
    })
  } else {
    r = await createCustomRule(body)
  }
  if (r.code === '0000') {
    notify(editingCustomId.value ? '规则已更新' : '规则添加成功')
    dialogOpen.value = false
    loadSecurity()
  } else {
    notify(r.info || '操作失败', 'error')
  }
}

function editBuiltinRule(rule) {
  builtinEditing.id = rule.id || rule.ruleId
  builtinEditing.name = rule.name || rule.ruleName || ''
  builtinEditing.action = rule.action || ''
  builtinDialogOpen.value = true
}

async function saveBuiltinAction() {
  const r = await updateBuiltinRule(builtinEditing.id, { action: builtinEditing.action })
  if (r.code === '0000') {
    notify('内置规则动作已更新')
    builtinDialogOpen.value = false
    loadSecurity()
  } else {
    notify(r.info || '更新失败', 'error')
  }
}

function removeRule(id) {
  const rule = custom.value.find((r) => r.id === id)
  confirmAction({
    title: '确认删除',
    body: `确定要删除规则 <strong>${escapeHtml(rule?.name || rule?.pattern || '')}</strong> 吗？`,
    onOk: async () => {
      const r = await deleteCustomRule(id)
      if (r.code === '0000') {
        notify('规则已删除')
        loadSecurity()
      } else {
        notify(r.info || '删除失败', 'error')
      }
    },
  })
}

function removeFinding(f) {
  confirmAction({
    title: '确认删除',
    body: '确定要删除这条安全发现记录吗？',
    onOk: async () => {
      const id = f.id || f.findingId
      if (!id) {
        notify('记录不存在', 'error')
        return
      }
      const r = await deleteFinding(id)
      if (r.code === '0000') {
        notify('记录已删除')
        loadSecurity()
      } else {
        notify(r.info || '删除失败', 'error')
      }
    },
  })
}

function removeAllFindings() {
  confirmAction({
    title: '确认全部删除',
    body: `确定要删除全部 <strong>${findings.length}</strong> 条安全发现记录吗？此操作不可恢复。`,
    onOk: async () => {
      const r = await clearFindings()
      if (r.code === '0000') {
        notify(`已清空全部安全发现（${r.data ?? findings.length} 条）`)
        loadSecurity()
      } else {
        notify(r.info || '删除失败', 'error')
      }
    },
  })
}

function togglePolicy(p) {
  p.on = !p.on
  notify('安全策略切换需要后端支持', 'info')
}

onMounted(loadSecurity)
</script>

<template>
  <div class="lgw-page">
    <div class="lgw-page-head">
      <div>
        <div class="lgw-page-title">安全审计</div>
        <div class="lgw-page-sub">安全策略 · 规则管理 · 审计日志</div>
      </div>
      <div class="lgw-page-actions">
        <button class="lgw-btn lgw-btn--soft lgw-btn--sm" :disabled="loading" @click="loadSecurity()">
          <AppIcon name="refresh" :class="{ 'lgw-spin': loading }" /> {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- 统计卡 -->
    <div class="lgw-grid lgw-grid-4" style="margin-bottom: 16px">
      <div class="lgw-panel lgw-stat">
        <div class="lgw-stat-icon" style="background: var(--lgw-green-bg); color: var(--lgw-green-fg)">
          <AppIcon name="security" />
        </div>
        <div class="lgw-stat-value">{{ enabledCount }}</div>
        <div class="lgw-stat-label">启用规则</div>
      </div>
      <div class="lgw-panel lgw-stat">
        <div class="lgw-stat-icon" style="background: var(--lgw-blue-bg); color: var(--lgw-blue-fg)">
          <AppIcon name="plus" />
        </div>
        <div class="lgw-stat-value">{{ custom.length }}</div>
        <div class="lgw-stat-label">自定义规则</div>
      </div>
      <div class="lgw-panel lgw-stat">
        <div class="lgw-stat-icon" style="background: var(--lgw-amber-bg); color: var(--lgw-amber-fg)">
          <AppIcon name="logs" />
        </div>
        <div class="lgw-stat-value">{{ findings.length }}</div>
        <div class="lgw-stat-label">安全发现</div>
      </div>
      <div class="lgw-panel lgw-stat">
        <div class="lgw-stat-icon" style="background: var(--lgw-rose-bg); color: var(--lgw-rose-fg)">
          <AppIcon name="test" />
        </div>
        <div class="lgw-stat-value">{{ highFindings }}</div>
        <div class="lgw-stat-label">高危发现</div>
      </div>
    </div>

    <!-- 策略 + 自定义规则 -->
    <div class="lgw-grid lgw-grid-2" style="margin-bottom: 16px">
      <div class="lgw-panel lgw-panel-pad">
        <div style="font-weight: 700; margin-bottom: 14px">安全策略配置</div>
        <div>
          <div v-for="p in policies" :key="p.key" class="sec-row">
            <span style="font-size: 13px; color: var(--lgw-muted-fg); font-weight: 500">{{ p.label }}</span>
            <div style="display: flex; align-items: center; gap: 10px">
              <span style="font-size: 12px; font-weight: 600; color: p.on ? 'var(--lgw-green-fg)' : 'var(--lgw-line-strong)'">
                {{ p.on ? '已启用' : '已禁用' }}
              </span>
              <div class="lgw-switch" :class="{ on: p.on }" @click="togglePolicy(p)">
                <div class="lgw-switch-knob" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lgw-panel lgw-panel-pad">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px">
          <span style="font-weight: 700">自定义规则</span>
          <button class="lgw-btn lgw-btn--primary lgw-btn--sm" @click="openRuleModal()">
            <AppIcon name="plus" /> 添加规则
          </button>
        </div>
        <div>
          <div v-for="r in custom" :key="r.id" class="rule-item">
            <div style="min-width: 0">
              <span class="lgw-tag lgw-tag--blue">{{ (r.ruleType || r.type) + ' · ' + (r.category || '') }}</span>
              <span style="margin-left: 8px; font-size: 13px; font-weight: 500">{{ r.name || r.pattern }}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0">
              <span class="lgw-tag" :class="severityTag(r.severity)">{{ r.severity }}</span>
              <span class="lgw-tag lgw-tag--slate">{{ r.action || '跟随全局' }}</span>
              <button
                class="lgw-btn lgw-btn--soft lgw-btn--sm lgw-btn--icon"
                title="编辑"
                @click="openRuleModal(r)"
              >
                <AppIcon name="edit" />
              </button>
              <button
                class="lgw-btn lgw-btn--danger lgw-btn--sm lgw-btn--icon"
                title="删除"
                @click="removeRule(r.id)"
              >
                <AppIcon name="trash" />
              </button>
            </div>
          </div>
          <div v-if="!custom.length" class="lgw-empty" style="min-height: 120px; padding: 20px">
            <AppIcon name="empty" :size="32" />
            <div class="lgw-empty-title">暂无自定义规则</div>
            <div class="lgw-empty-desc">点击右上角添加</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 内置规则 -->
    <div class="lgw-panel" style="margin-bottom: 16px; overflow: hidden">
      <div class="sec-table-head">
        内置规则 <span class="lgw-tag lgw-tag--slate">{{ builtin.length }}</span>
      </div>
      <div class="lgw-table-wrap">
        <table class="lgw-table">
          <thead>
            <tr>
              <th>规则名称</th>
              <th>类别</th>
              <th>严重度</th>
              <th>动作</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in builtin" :key="r.id || r.ruleId">
              <td>
                <div style="font-weight: 600">{{ r.name || r.ruleName }}</div>
                <div v-if="r.description" style="font-size: 12px; color: var(--lgw-muted-fg); margin-top: 2px; max-width: 380px">
                  {{ r.description }}
                </div>
              </td>
              <td><span class="lgw-tag lgw-tag--slate">{{ r.category || r.type }}</span></td>
              <td><span class="lgw-tag" :class="severityTag(r.severity)">{{ r.severity }}</span></td>
              <td><span class="lgw-tag lgw-tag--slate">{{ r.action || '跟随全局' }}</span></td>
              <td>
                <div
                  class="lgw-switch"
                  :class="{ on: r.enabled }"
                  :title="r.enabled ? '点击禁用' : '点击启用'"
                  @click="toggleRule(r.id || r.ruleId, !r.enabled)"
                >
                  <div class="lgw-switch-knob" />
                </div>
              </td>
              <td>
                <div class="lgw-row-actions">
                  <button
                    class="lgw-btn lgw-btn--soft lgw-btn--sm lgw-btn--icon"
                    title="编辑动作"
                    @click="editBuiltinRule(r)"
                  >
                    <AppIcon name="edit" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!builtin.length">
              <td colspan="6">
                <div class="lgw-empty" style="min-height: 120px; padding: 20px">
                  <AppIcon name="empty" :size="32" />
                  <div class="lgw-empty-title">暂无内置规则</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 安全发现 -->
    <div class="lgw-panel" style="overflow: hidden">
      <div class="sec-table-head">
        安全发现 <span class="lgw-tag lgw-tag--slate">{{ findings.length }}</span>
        <div style="flex: 1"></div>
        <button
          class="lgw-btn lgw-btn--danger lgw-btn--sm"
          :disabled="!findings.length"
          title="清空全部安全发现记录"
          @click="removeAllFindings()"
        >
          <AppIcon name="trash" /> 全部删除
        </button>
      </div>
      <div class="lgw-table-wrap">
        <table class="lgw-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>规则</th>
              <th>严重度</th>
              <th>内容</th>
              <th>处理动作</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(f, i) in findings" :key="i">
              <td style="font-size: 12px; color: var(--lgw-muted-fg); white-space: nowrap">
                {{ formatDate(f.createdAt || f.timestamp) }}
              </td>
              <td style="font-weight: 600">{{ f.title || f.ruleName || f.ruleId || f.rule || '-' }}</td>
              <td><span class="lgw-tag" :class="severityTag(f.severity)">{{ f.severity }}</span></td>
              <td style="font-size: 12px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--lgw-muted-fg)">
                {{ f.description || f.evidenceMasked || f.content || f.detail || '-' }}
              </td>
              <td><span class="lgw-tag lgw-tag--slate">{{ f.action || f.resolution || 'audit' }}</span></td>
              <td>
                <div class="lgw-row-actions">
                  <button
                    class="lgw-btn lgw-btn--danger lgw-btn--sm lgw-btn--icon"
                    title="删除"
                    @click="removeFinding(f)"
                  >
                    <AppIcon name="trash" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!findings.length">
              <td colspan="6">
                <div class="lgw-empty" style="min-height: 120px; padding: 20px">
                  <AppIcon name="empty" :size="32" />
                  <div class="lgw-empty-title">暂无安全发现记录</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 添加/编辑自定义规则弹窗 -->
    <ModalBox :open="dialogOpen" :title="editingCustomId ? '编辑自定义规则' : '添加自定义规则'" @close="dialogOpen = false">
      <div class="lgw-field">
        <label class="lgw-field-label">规则名称</label>
        <input v-model="ruleForm.name" class="lgw-input" placeholder="如：敏感路径检测" />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
        <div class="lgw-field">
          <label class="lgw-field-label">规则类型</label>
          <select v-model="ruleForm.ruleType" class="lgw-input" :disabled="!!editingCustomId">
            <option value="blacklist">黑名单</option>
            <option value="whitelist">白名单</option>
          </select>
        </div>
        <div class="lgw-field">
          <label class="lgw-field-label">规则类别</label>
          <select v-model="ruleForm.category" class="lgw-input" :disabled="!!editingCustomId">
            <option value="keyword">关键词 keyword</option>
            <option value="domain">域名 domain</option>
            <option value="tool">工具 tool</option>
            <option value="path">路径 path</option>
          </select>
        </div>
      </div>
      <div class="lgw-field">
        <label class="lgw-field-label">匹配模式</label>
        <input v-model="ruleForm.pattern" class="lgw-input" placeholder="如：/etc/passwd" style="font-family: monospace" />
        <div class="lgw-field-hint">子串匹配，非正则</div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
        <div class="lgw-field">
          <label class="lgw-field-label">严重度</label>
          <select v-model="ruleForm.severity" class="lgw-input">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div class="lgw-field">
          <label class="lgw-field-label">命中动作</label>
          <select v-model="ruleForm.action" class="lgw-input">
            <option value="">跟随全局策略</option>
            <option value="warn">warn 警告</option>
            <option value="redact">redact 脱敏</option>
            <option value="block">block 阻断</option>
          </select>
        </div>
      </div>
      <template #footer>
        <button class="lgw-btn lgw-btn--soft" @click="dialogOpen = false">取消</button>
        <button class="lgw-btn lgw-btn--primary" @click="addRule()">{{ editingCustomId ? '保存' : '添加' }}</button>
      </template>
    </ModalBox>

    <!-- 内置规则动作编辑弹窗 -->
    <ModalBox :open="builtinDialogOpen" title="编辑内置规则动作" @close="builtinDialogOpen = false">
      <div class="lgw-field">
        <label class="lgw-field-label">规则</label>
        <input class="lgw-input" :value="builtinEditing.name" disabled />
      </div>
      <div class="lgw-field">
        <label class="lgw-field-label">命中动作</label>
        <select v-model="builtinEditing.action" class="lgw-input">
          <option value="">跟随全局策略</option>
          <option value="warn">warn 警告</option>
          <option value="redact">redact 脱敏</option>
          <option value="block">block 阻断</option>
        </select>
      </div>
      <template #footer>
        <button class="lgw-btn lgw-btn--soft" @click="builtinDialogOpen = false">取消</button>
        <button class="lgw-btn lgw-btn--primary" @click="saveBuiltinAction()">保存</button>
      </template>
    </ModalBox>
  </div>
</template>

<style scoped>
.sec-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--lgw-line);
}
.sec-row:last-child {
  border-bottom: none;
}
.rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--lgw-line);
  gap: 10px;
}
.rule-item:last-child {
  border-bottom: none;
}
.sec-table-head {
  padding: 14px 16px;
  border-bottom: 1px solid var(--lgw-line);
  font-weight: 700;
  font-size: 13px;
  background: var(--lgw-slate);
  display: flex;
  align-items: center;
  gap: 8px;
}
.lgw-table th,
.lgw-table td {
  text-align: left;
}
</style>
