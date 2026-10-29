<script setup>
import { onMounted, ref, computed } from 'vue'
import { fetchLogs, clearLogs, deleteLog } from '@/api/gateway'
import { formatDate, prettyJson } from '@/utils/format'
import { notify } from '@/utils/toast'
import { confirmAction } from '@/utils/dialog'
import AppIcon from '@/components/AppIcon.vue'

const loading = ref(false)
const logs = ref([])
const keyword = ref('')
const modelFilter = ref('')
const expandedId = ref(null)

// 分页
const page = ref(1)
const total = ref(0)
const PAGE_SIZE = 15

// 安全风险徽章
function riskTag(r) {
  if (!r || r === 'Clean' || r === 'LOW' || r === 'Low') return { cls: 'lgw-tag--green', text: 'Clean' }
  if (r === 'MEDIUM' || r === 'Medium') return { cls: 'lgw-tag--amber', text: r }
  if (r === 'High' || r === 'HIGH' || r === 'Critical' || r === 'CRITICAL') return { cls: 'lgw-tag--red', text: r }
  return { cls: 'lgw-tag--slate', text: r || 'Clean' }
}

// 安全动作徽章
function actionTag(a) {
  if (!a || a === 'Allow') return { cls: 'lgw-tag--green', text: 'Allow' }
  if (a === 'Sanitize') return { cls: 'lgw-tag--amber', text: 'Sanitize' }
  if (a === 'Block') return { cls: 'lgw-tag--red', text: 'Block' }
  return { cls: 'lgw-tag--slate', text: a }
}

// 状态码徽章：2xx 绿 / 4xx 黄 / 5xx 红 / 其他灰
function codeBadge(code) {
  if (code == null || code === '') return { cls: 'lgw-tag--slate', text: '-' }
  const c = Number(code)
  if (c >= 200 && c < 300) return { cls: 'lgw-tag--green', text: code }
  if (c >= 300 && c < 400) return { cls: 'lgw-tag--slate', text: code }
  if (c >= 400 && c < 500) return { cls: 'lgw-tag--amber', text: code }
  if (c >= 500) return { cls: 'lgw-tag--red', text: code }
  return { cls: 'lgw-tag--slate', text: code }
}

function logId(l) {
  return l.id || l.traceId || ''
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id
}

async function loadLogs(p) {
  const targetPage = p || page.value
  loading.value = true
  const params = { page: targetPage, size: PAGE_SIZE }
  if (keyword.value) params.keyword = keyword.value
  if (modelFilter.value) params.model = modelFilter.value
  const r = await fetchLogs(params)
  if (r.code === '0000') {
    // 兼容两种返回：分页对象 {records,total} 或纯数组
    const d = r.data
    if (Array.isArray(d)) {
      logs.value = d
      total.value = d.length
    } else {
      logs.value = d?.records || []
      total.value = d?.total || 0
    }
    page.value = targetPage
  } else {
    logs.value = []
    total.value = 0
    notify(r.info || '加载失败', 'error')
  }
  loading.value = false
}

function searchLogs() {
  loadLogs(1)
}

function changePage(p) {
  if (p < 1 || p > pages.value) return
  loadLogs(p)
}

const pages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

function clearAllLogs() {
  confirmAction({
    title: '确认删除',
    body: '确定要删除<strong>全部日志</strong>吗？',
    onOk: async () => {
      const r = await clearLogs()
      if (r.code === '0000') {
        notify('日志已清空')
        loadLogs(1)
      } else {
        notify(r.info || '清空失败', 'error')
      }
    },
  })
}

function removeLog(log) {
  const id = log.id || log.logId
  if (!id) {
    notify('日志记录不存在', 'error')
    return
  }
  confirmAction({
    title: '确认删除',
    body: '确定要删除这条日志记录吗？',
    onOk: async () => {
      const r = await deleteLog(id)
      if (r.code === '0000') {
        notify('日志已删除')
        loadLogs(page.value)
      } else {
        notify(r.info || '删除失败', 'error')
      }
    },
  })
}

onMounted(() => loadLogs(1))
</script>

<template>
  <div class="lgw-page">
    <div class="lgw-page-head">
      <div>
        <div class="lgw-page-title">请求日志</div>
        <div class="lgw-page-sub">API 调用记录 · 安全审计 · 链路追踪</div>
      </div>
      <div class="lgw-page-actions">
        <button class="lgw-btn lgw-btn--soft lgw-btn--sm" :disabled="loading" @click="loadLogs(page)">
          <AppIcon name="refresh" :size="14" :class="{ 'lgw-spin': loading }" /> {{ loading ? '刷新中...' : '刷新' }}
        </button>
        <button class="lgw-btn lgw-btn--danger lgw-btn--sm" @click="clearAllLogs">
          <AppIcon name="trash" :size="14" /> 清空
        </button>
      </div>
    </div>

    <div class="lgw-panel" style="margin-bottom: 16px">
      <div class="filter-bar">
        <input
          v-model="keyword"
          class="lgw-input"
          placeholder="搜索关键词..."
          style="flex: 1; min-width: 160px"
          @keydown.enter="searchLogs"
        />
        <input
          v-model="modelFilter"
          class="lgw-input"
          placeholder="模型筛选"
          style="width: 150px"
          @keydown.enter="searchLogs"
        />
        <button class="lgw-btn lgw-btn--primary lgw-btn--sm" @click="searchLogs">
          <AppIcon name="search" :size="14" /> 搜索
        </button>
      </div>
    </div>

    <div class="lgw-panel" style="overflow: hidden">
      <div class="lgw-table-wrap">
        <table class="lgw-table">
          <thead>
            <tr>
              <th style="width: 34px"></th>
              <th>时间</th>
              <th>TraceID</th>
              <th>渠道</th>
              <th>模型</th>
              <th>上游模型</th>
              <th>状态</th>
              <th>Token</th>
              <th>耗时</th>
              <th>模式</th>
              <th>安全</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="l in logs" :key="logId(l)">
              <tr
                class="log-row"
                :class="{ expanded: expandedId === logId(l) }"
                @click="toggleExpand(logId(l))"
              >
                <td class="log-arrow-cell">
                  <svg
                    class="log-arrow"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    :width="14"
                    :height="14"
                  >
                    <template v-if="expandedId === logId(l)">
                      <polyline points="6 9 12 15 18 9" />
                    </template>
                    <template v-else>
                      <polyline points="9 6 15 12 9 18" />
                    </template>
                  </svg>
                </td>
                <td class="log-time">{{ formatDate(l.createdAt) }}</td>
                <td><span class="log-code">{{ (l.traceId || '').substring(0, 8) }}</span></td>
                <td class="log-ellipsis ch" :title="l.channelName || '-'">{{ l.channelName || '-' }}</td>
                <td class="log-ellipsis log-model" :title="l.model || '-'">{{ l.model || '-' }}</td>
                <td class="log-ellipsis log-upstream" :title="l.upstreamModel || '-'">{{ l.upstreamModel || '-' }}</td>
                <td>
                  <span class="lgw-tag" :class="codeBadge(l.statusCode).cls">{{ codeBadge(l.statusCode).text }}</span>
                </td>
                <td class="num">{{ l.totalTokens || 0 }}</td>
                <td class="num">{{ (l.durationMs || 0) + 'ms' }}</td>
                <td>
                  <span v-if="l.isStream" class="lgw-tag lgw-tag--blue">Stream</span>
                  <span v-else class="lgw-tag lgw-tag--slate">Sync</span>
                </td>
                <td>
                  <span class="lgw-tag" :class="riskTag(l.riskLevel).cls">{{ riskTag(l.riskLevel).text }}</span>
                </td>
                <td>
                  <div class="lgw-row-actions">
                    <button
                      class="lgw-btn lgw-btn--danger lgw-btn--sm lgw-btn--icon"
                      title="删除"
                      @click.stop="removeLog(l)"
                    >
                      <AppIcon name="trash" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="expandedId === logId(l)" class="expand-row">
                <td colspan="12">
                  <div class="expand-content">
                    <div class="expand-grid">
                      <div><strong>TraceID</strong> <span class="log-code">{{ l.traceId || '-' }}</span></div>
                      <div><strong>安全动作</strong> <span class="lgw-tag" :class="actionTag(l.securityAction).cls">{{ actionTag(l.securityAction).text }}</span></div>
                      <div><strong>API Key</strong> {{ l.apiKeyId || l.apiKeyName || '-' }}</div>
                      <div><strong>渠道</strong> {{ l.channelName || '-' }} <span v-if="l.channelId" class="log-code">{{ String(l.channelId).substring(0, 8) }}</span></div>
                      <div><strong>模型</strong> {{ l.model || '-' }} → {{ l.upstreamModel || '-' }}</div>
                      <div><strong>模式</strong> {{ l.mode || 'chat' }} <template v-if="l.isStream">· Stream</template> <template v-if="l.isRetry">· Retry</template></div>
                      <div><strong>状态码</strong> {{ l.statusCode || '-' }}</div>
                      <div><strong>耗时</strong> {{ l.durationMs || 0 }}ms</div>
                      <div><strong>Token</strong> P:{{ l.promptTokens || 0 }} C:{{ l.completionTokens || 0 }} T:{{ l.totalTokens || 0 }}</div>
                      <div>
                        <strong>风险</strong>
                        <span class="lgw-tag" :class="riskTag(l.riskLevel).cls">{{ riskTag(l.riskLevel).text }}</span>
                        <template v-if="l.riskScore != null">（分数 {{ l.riskScore }}）</template>
                        <template v-if="l.riskSummary"> · {{ l.riskSummary }}</template>
                      </div>
                      <div><strong>时间</strong> {{ formatDate(l.createdAt, true) }}</div>
                      <div><strong>客户端 IP</strong> {{ l.clientIp || '-' }}</div>
                    </div>
                    <div v-if="l.sanitized" class="warn-line">
                      <strong>⚠ 已脱敏处理</strong>
                    </div>
                    <div v-if="l.blockedReason" class="err-line">
                      <strong>阻断原因:</strong> {{ l.blockedReason }}
                    </div>
                    <div v-if="l.errorMessage" class="err-line">
                      <strong>错误:</strong> {{ l.errorMessage }}
                    </div>
                    <details v-if="l.requestBody" class="detail-block">
                      <summary>请求体</summary>
                      <pre class="expand-pre">{{ prettyJson(l.requestBody) }}</pre>
                    </details>
                    <details v-if="l.responseChoices" class="detail-block">
                      <summary>响应内容</summary>
                      <pre class="expand-pre">{{ prettyJson(l.responseChoices) }}</pre>
                    </details>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="!loading && !logs.length">
              <td colspan="12">
                <div class="lgw-empty">
                  <AppIcon name="empty" :size="32" />
                  <div class="lgw-empty-title">暂无日志</div>
                  <div class="lgw-empty-desc">请求后将在此展示</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="total > 0" class="pagination">
        <span class="pagination-info">共 {{ total }} 条 · 第 {{ page }}/{{ pages }} 页</span>
        <div class="pagination-btns">
          <button class="lgw-btn lgw-btn--soft lgw-btn--sm" :disabled="page <= 1" @click="changePage(page - 1)">‹ 上一页</button>
          <button class="lgw-btn lgw-btn--soft lgw-btn--sm" :disabled="page >= pages" @click="changePage(page + 1)">下一页 ›</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 10px;
  padding: 16px 18px;
  flex-wrap: wrap;
  align-items: center;
}

.log-code {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 11px;
  background: var(--lgw-muted);
  padding: 2px 7px;
  border-radius: var(--lgw-r-xs);
  color: var(--lgw-fg);
  border: 1px solid var(--lgw-line);
}

/* 展开箭头列 */
.log-arrow-cell {
  width: 34px;
  padding-right: 2px !important;
}
.log-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--lgw-muted-fg);
  opacity: .55;
  transition: var(--lgw-ease);
}
.log-row {
  cursor: pointer;
}
.log-row td {
  white-space: nowrap;
}
.log-row:hover {
  background: var(--lgw-slate);
}
.log-row:hover .log-arrow {
  opacity: 1;
}
.log-row.expanded .log-arrow {
  opacity: 1;
  color: var(--lgw-primary);
}
.log-row.expanded > td {
  background: var(--lgw-primary-ll) !important;
}
.log-row.expanded > td:first-child {
  box-shadow: inset 3px 0 0 var(--lgw-primary);
}

/* 长文本省略 */
.log-ellipsis {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.log-ellipsis.ch {
  max-width: 150px;
  font-size: 12px;
}
.log-model {
  font-weight: 600;
}
.log-upstream {
  font-size: 12px;
  color: var(--lgw-muted-fg);
}
.log-time {
  color: var(--lgw-muted-fg);
  font-size: 12px;
}
.num {
  font-variant-numeric: tabular-nums;
}

/* 展开行 */
.expand-row td {
  padding: 0 !important;
  background: var(--lgw-slate);
}
.expand-content {
  padding: 20px 22px;
}
.expand-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 28px;
  font-size: 13px;
}
.expand-grid > div {
  padding: 4px 0;
}
.expand-grid strong {
  color: var(--lgw-muted-fg);
  font-weight: 600;
  display: inline-block;
  min-width: 84px;
}
.expand-pre {
  background: var(--lgw-side);
  color: var(--lgw-fg);
  padding: 16px;
  border-radius: var(--lgw-r);
  font-size: 12px;
  overflow-x: auto;
  max-height: 280px;
  font-family: 'SF Mono', Monaco, monospace;
  margin-top: 8px;
  white-space: pre-wrap;
  word-break: break-all;
}
.detail-block {
  margin-top: 12px;
}
.detail-block summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--lgw-muted-fg);
  font-size: 13px;
}
.warn-line {
  color: var(--lgw-amber-fg);
  margin-top: 10px;
  font-size: 12px;
}
.err-line {
  color: var(--lgw-rose-fg);
  margin-top: 8px;
  font-size: 12px;
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-top: 1px solid var(--lgw-line);
  flex-wrap: wrap;
  gap: 10px;
}
.pagination-info {
  font-size: 13px;
  color: var(--lgw-muted-fg);
}
.pagination-btns {
  display: flex;
  gap: 8px;
}
.pagination-btns .lgw-btn[disabled] {
  opacity: .5;
  cursor: not-allowed;
}

@media (max-width: 860px) {
  .expand-grid {
    grid-template-columns: 1fr;
  }
}
</style>
