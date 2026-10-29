<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchDashboard, fetchLogs, fetchChannels, fetchApiKeys } from '@/api/gateway'
import { compactNumber, formatTime, escapeHtml } from '@/utils/format'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()

const loading = ref(true)
const dashboard = ref({})
const logs = ref([])
const channels = ref([])
const apiKeys = ref([])

const availability = computed(() =>
  channels.value.length
    ? Math.round((channels.value.filter((c) => c.status === 1).length / channels.value.length) * 100)
    : 100,
)
const errRate = computed(() =>
  dashboard.value.totalRequests ? (dashboard.value.totalErrors / dashboard.value.totalRequests) * 100 : 0,
)
const errRateText = computed(() => errRate.value.toFixed(1))

const availabilityTone = computed(() => {
  if (availability.value >= 80) return { bg: 'var(--lgw-green-bg)', fg: 'var(--lgw-green-fg)', border: 'rgba(16,185,129,.2)' }
  if (availability.value >= 50) return { bg: 'var(--lgw-amber-bg)', fg: 'var(--lgw-amber-fg)', border: 'rgba(245,158,11,.2)' }
  return { bg: 'var(--lgw-rose-bg)', fg: 'var(--lgw-rose-fg)', border: 'rgba(244,63,94,.2)' }
})

const metrics = computed(() => [
  { label: '总请求数', value: compactNumber(dashboard.value.totalRequests ?? 0), icon: 'requests', tone: 'var(--lgw-blue-bg)', fg: 'var(--lgw-blue-fg)' },
  { label: '总 Token', value: compactNumber(dashboard.value.totalTokens ?? 0), icon: 'tokens', tone: 'var(--lgw-amber-bg)', fg: 'var(--lgw-amber-fg)' },
  { label: '活跃渠道', value: (dashboard.value.activeChannels ?? 0) + '/' + channels.value.length, icon: 'channels', tone: 'var(--lgw-green-bg)', fg: 'var(--lgw-green-fg)' },
  { label: '活跃密钥', value: dashboard.value.activeApiKeys ?? 0, icon: 'keys', tone: 'var(--lgw-indigo-bg)', fg: 'var(--lgw-indigo-fg)' },
  { label: '平均延迟', value: Math.round(dashboard.value.avgDurationMs || 0) + 'ms', icon: 'active', tone: 'var(--lgw-violet-bg)', fg: 'var(--lgw-violet-fg)' },
  { label: '错误次数', value: dashboard.value.totalErrors ?? 0, icon: 'test', tone: 'var(--lgw-rose-bg)', fg: 'var(--lgw-rose-fg)' },
  { label: '健康分', value: dashboard.value.healthScore ?? 100, icon: 'security', tone: 'var(--lgw-cyan-bg)', fg: 'var(--lgw-cyan-fg)' },
  { label: '健康等级', value: dashboard.value.healthBadge || 'excellent', icon: 'dashboard', tone: 'var(--lgw-teal-bg)', fg: 'var(--lgw-teal-fg)' },
])

const quickActions = [
  { title: '新建渠道', icon: 'plus', page: '/channels' },
  { title: '管理密钥', icon: 'keys', page: '/apikeys' },
  { title: '接入示例', icon: 'usage', page: '/usage' },
  { title: '审计日志', icon: 'logs', page: '/logs' },
  { title: '安全设置', icon: 'security', page: '/security' },
]

const healthScore = computed(() => dashboard.value.healthScore ?? 100)
const healthBadge = computed(() => dashboard.value.healthBadge || 'excellent')

function healthTagClass(b) {
  if (b === 'excellent') return 'lgw-tag--green'
  if (b === 'good') return 'lgw-tag--blue'
  if (b === 'warning') return 'lgw-tag--amber'
  return 'lgw-tag--red'
}
function healthFillColor(s) {
  if (s >= 90) return 'linear-gradient(90deg,#22c55e,#10b981)'
  if (s >= 70) return 'linear-gradient(90deg,#f59e0b,#fbbf24)'
  return 'linear-gradient(90deg,#ef4444,#f87171)'
}

// 最近 12 小时请求趋势
const trendBars = computed(() => {
  const hours = {}
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const h = new Date(now - i * 3600 * 1000)
    hours[h.getHours() + ':00'] = 0
  }
  logs.value.forEach((l) => {
    try {
      const t = new Date(l.createdAt)
      if ((now - t) / 3600000 < 12) {
        const k = t.getHours() + ':00'
        if (k in hours) hours[k]++
      }
    } catch {
      // 忽略异常时间
    }
  })
  const max = Math.max(...Object.values(hours), 1)
  const peak = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]?.[0]
  return Object.entries(hours).map(([label, count]) => ({
    label,
    count,
    height: (count / max) * 100,
    peak: label === peak && count > 0,
  }))
})

// 渠道调用分布
const channelDist = computed(() => {
  if (!channels.value.length && !logs.value.length) return []
  const byName = {}
  logs.value.forEach((l) => {
    const n = l.channelName || '未知'
    byName[n] = (byName[n] || 0) + 1
  })
  const entries = Object.entries(byName)
  const colors = ['#2f6fed', '#10b981', '#f59e0b', '#7c3aed', '#f43f5e', '#06b6d4', '#ec4899']
  if (!entries.length) {
    const byType = {}
    channels.value.forEach((c) => {
      byType[c.type] = (byType[c.type] || 0) + 1
    })
    const total = channels.value.length || 1
    return Object.entries(byType).map(([t, n], i) => ({
      name: t,
      count: n,
      pct: (n / total) * 100,
      color: colors[i % colors.length],
    }))
  }
  const total = logs.value.length
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([t, n], i) => ({
      name: t,
      count: n,
      pct: (n / total) * 100,
      color: colors[i % colors.length],
    }))
})

const recentList = computed(() => logs.value.slice(0, 8))

// 运维建议
const opCards = computed(() => [
  {
    icon: 'channels',
    title: '渠道健康度',
    desc:
      availability.value >= 80
        ? '当前渠道运行正常，各线路可用。'
        : availability.value >= 50
          ? '部分渠道不可用，建议检查并启用备用线路。'
          : '活跃渠道较少，请前往渠道页测试并启用。',
  },
  {
    icon: 'keys',
    title: '密钥配额',
    desc:
      apiKeys.value.length > 0
        ? '共 ' + apiKeys.value.length + ' 个密钥，定期检查配额使用情况。'
        : '尚未创建密钥，请前往 API 密钥页创建。',
  },
  {
    icon: 'active',
    title: '性能监控',
    desc:
      (dashboard.value.avgDurationMs || 0) < 2000
        ? '平均延迟 ' + Math.round(dashboard.value.avgDurationMs || 0) + 'ms，响应正常。'
        : '平均延迟较高，建议查看日志排查慢请求。',
  },
  {
    icon: 'security',
    title: '安全审计',
    desc: '当前无安全风险记录，系统运行安全。',
  },
])

function unwrapList(r) {
  if (!r || r.code !== '0000') return []
  const d = r.data
  if (Array.isArray(d)) return d
  if (d && Array.isArray(d.records)) return d.records
  return []
}

async function loadDashboard() {
  loading.value = true
  try {
    const [d, rl, rc, rk] = await Promise.all([
      fetchDashboard(),
      fetchLogs({ page: 1, size: 50 }),
      fetchChannels(),
      fetchApiKeys(),
    ])
    if (d && d.code === '0000') dashboard.value = d.data || {}
    else if (d) console.warn('[dashboard] /v1/dashboard:', d.code, d.info)
    logs.value = unwrapList(rl)
    channels.value = unwrapList(rc)
    apiKeys.value = unwrapList(rk)
  } catch (e) {
    console.error('[dashboard] load error:', e)
  }
  loading.value = false
}

onMounted(loadDashboard)
</script>

<template>
  <div class="lgw-page">
    <!-- 欢迎区 -->
    <div class="dash-hero">
      <div>
        <h1 class="dash-title">欢迎使用 LLMAPI</h1>
        <p class="dash-sub">
          在一个统一入口中管理上游模型渠道、下游密钥、请求统计与故障切换，让本地 LLM 网关更稳定、更清晰、更易运维。
        </p>
      </div>
      <div class="dash-hero-right">
        <div class="lgw-health-mini" :style="{ borderColor: availabilityTone.border, background: availabilityTone.bg }">
          <AppIcon name="security" :size="20" />
          <div>
            <div class="lgw-health-label">服务可用率</div>
            <div class="lgw-health-value" :style="{ color: availabilityTone.fg }">{{ availability }}%</div>
          </div>
        </div>
        <div class="lgw-health-mini">
          <AppIcon name="tokens" :size="20" />
          <div>
            <div class="lgw-health-label">错误率</div>
            <div class="lgw-health-value" :style="{ color: errRate > 5 ? 'var(--lgw-danger)' : 'var(--lgw-fg)' }">
              {{ errRateText }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="dash-actions">
      <button v-for="a in quickActions" :key="a.page" class="lgw-pill" @click="router.push(a.page)">
        <AppIcon :name="a.icon" /> {{ a.title }}
      </button>
    </div>

    <!-- 指标卡 -->
    <div class="lgw-grid lgw-grid-8" style="margin-bottom: 16px">
      <div v-for="m in metrics" :key="m.label" class="lgw-panel lgw-stat">
        <div class="lgw-stat-icon" :style="{ background: m.tone, color: m.fg }">
          <AppIcon :name="m.icon" />
        </div>
        <div class="lgw-stat-value">{{ m.value }}</div>
        <div class="lgw-stat-label">{{ m.label }}</div>
      </div>
    </div>

    <!-- 健康度 + 趋势 -->
    <div class="lgw-grid lgw-grid-2" style="margin-bottom: 16px">
      <div class="lgw-panel lgw-panel-pad">
        <div class="panel-head">
          <div>
            <div class="lgw-panel-title">系统健康度</div>
            <div class="lgw-panel-desc">综合服务运行状态评估</div>
          </div>
          <span class="lgw-tag" :class="healthTagClass(healthBadge)">{{ healthBadge }}</span>
        </div>
        <div class="health-bar-row">
          <div class="health-bar">
            <div class="health-bar-fill" :style="{ width: healthScore + '%', background: healthFillColor(healthScore) }" />
          </div>
          <div class="health-score">{{ healthScore }}</div>
        </div>
        <div class="health-meta">
          <span>平均耗时 <strong>{{ Math.round(dashboard.avgDurationMs || 0) }}ms</strong></span>
          <span>错误 <strong>{{ dashboard.totalErrors ?? 0 }}</strong> 次</span>
        </div>
      </div>

      <div class="lgw-panel lgw-panel-pad">
        <div class="lgw-panel-title" style="margin-bottom: 16px">最近请求时间分布</div>
        <div v-if="trendBars.length" class="lgw-trend">
          <div
            v-for="(b, i) in trendBars"
            :key="i"
            class="lgw-trend-bar"
            :class="{ peak: b.peak }"
            :style="{ height: Math.max(b.height, 3) + '%' }"
            :title="b.label + ': ' + b.count + '次'"
          />
        </div>
        <div v-else class="lgw-empty" style="min-height: 120px; padding: 20px">
          <AppIcon name="empty" :size="32" />
          <div class="lgw-empty-title">暂无数据</div>
          <div class="lgw-empty-desc">请求后将展示趋势</div>
        </div>
        <div class="trend-axis">
          <span>12h 前</span>
          <span>现在</span>
        </div>
      </div>
    </div>

    <!-- 渠道分布 + 最近请求 -->
    <div class="lgw-grid lgw-grid-2" style="margin-bottom: 16px">
      <div class="lgw-panel lgw-panel-pad">
        <div class="lgw-panel-title" style="margin-bottom: 14px">渠道调用分布</div>
        <div v-if="channelDist.length">
          <div v-for="(d, i) in channelDist" :key="i" class="lgw-dist-row">
            <span class="lgw-dist-dot" :style="{ background: d.color }" />
            <span class="lgw-dist-name">{{ d.name }}</span>
            <div class="lgw-dist-bar">
              <div class="lgw-dist-fill" :style="{ width: d.pct + '%', background: d.color }" />
            </div>
            <span class="lgw-dist-count">{{ d.count }}</span>
          </div>
        </div>
        <div v-else class="lgw-empty" style="min-height: 120px; padding: 20px">
          <AppIcon name="empty" :size="32" />
          <div class="lgw-empty-title">暂无渠道</div>
          <div class="lgw-empty-desc">添加渠道后查看分布</div>
        </div>
      </div>

      <div class="lgw-panel lgw-panel-pad">
        <div class="lgw-panel-title" style="margin-bottom: 14px">最近请求</div>
        <div v-if="recentList.length" class="recent-list">
          <div v-for="(l, i) in recentList" :key="i" class="lgw-recent-item">
            <span class="lgw-recent-time">{{ formatTime(l.createdAt) }}</span>
            <span class="lgw-recent-model">{{ escapeHtml(l.model || '-') }}</span>
            <span class="lgw-tag" :class="l.statusCode === 200 ? 'lgw-tag--green' : 'lgw-tag--red'">
              {{ l.statusCode }}
            </span>
            <span class="lgw-recent-dur">{{ (l.durationMs || 0) + 'ms' }}</span>
          </div>
        </div>
        <div v-else class="lgw-empty" style="min-height: 120px; padding: 20px">
          <AppIcon name="empty" :size="32" />
          <div class="lgw-empty-title">暂无请求记录</div>
          <div class="lgw-empty-desc">请求后将在此展示</div>
        </div>
      </div>
    </div>

    <!-- 运维建议 -->
    <div class="lgw-panel lgw-panel-pad">
      <div class="lgw-panel-title">运维建议</div>
      <div class="lgw-panel-desc" style="margin-bottom: 18px">根据当前系统状态给出的运维参考</div>
      <div class="lgw-grid lgw-grid-4">
        <div v-for="c in opCards" :key="c.title" class="op-card">
          <div class="op-card-title">
            <AppIcon :name="c.icon" :size="16" />
            <span>{{ c.title }}</span>
          </div>
          <p class="op-card-desc">{{ c.desc }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dash-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.dash-title {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--lgw-fg);
}
.dash-sub {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--lgw-muted-fg);
  max-width: 640px;
}
.dash-hero-right {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.dash-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.health-bar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.health-bar {
  flex: 1;
  height: 12px;
  background: var(--lgw-slate);
  border-radius: var(--lgw-r-full);
  overflow: hidden;
}
.health-bar-fill {
  height: 100%;
  border-radius: var(--lgw-r-full);
  transition: width 0.6s ease;
}
.health-score {
  font-size: 26px;
  font-weight: 700;
  min-width: 48px;
  text-align: right;
}
.health-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 13px;
  color: var(--lgw-muted-fg);
}
.health-meta strong {
  color: var(--lgw-fg);
  font-weight: 600;
}

.lgw-health-mini {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: var(--lgw-r-2xl);
  border: 1px solid var(--lgw-line);
  padding: 12px 16px;
  background: var(--lgw-card);
}
.lgw-health-label {
  font-size: 12px;
  color: var(--lgw-muted-fg);
}
.lgw-health-value {
  font-size: 18px;
  font-weight: 700;
}

/* 趋势 */
.lgw-trend {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 52px;
  margin-top: 8px;
}
.lgw-trend-bar {
  flex: 1;
  background: var(--lgw-primary-ll);
  border-radius: 3px 3px 0 0;
  min-height: 3px;
  transition: var(--lgw-ease);
}
.lgw-trend-bar:hover {
  background: var(--lgw-primary);
}
.lgw-trend-bar.peak {
  background: var(--lgw-primary);
}
.trend-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: var(--lgw-muted-fg);
}

/* 渠道分布 */
.lgw-dist-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 13px;
}
.lgw-dist-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.lgw-dist-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lgw-dist-bar {
  flex: 1;
  height: 6px;
  background: var(--lgw-slate);
  border-radius: var(--lgw-r-full);
  overflow: hidden;
}
.lgw-dist-fill {
  height: 100%;
  border-radius: var(--lgw-r-full);
  transition: width 0.5s ease;
}
.lgw-dist-count {
  font-weight: 600;
  min-width: 24px;
  text-align: right;
  color: var(--lgw-fg);
}

/* 最近请求 */
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lgw-recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 10px;
  border-radius: var(--lgw-r);
  font-size: 13px;
  transition: var(--lgw-ease);
  gap: 10px;
}
.lgw-recent-item:hover {
  background: var(--lgw-slate);
}
.lgw-recent-time {
  color: var(--lgw-muted-fg);
  font-size: 11px;
  width: 54px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.lgw-recent-model {
  font-weight: 600;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.lgw-recent-dur {
  color: var(--lgw-muted-fg);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* 运维建议 */
.op-card {
  border: 1px solid var(--lgw-line);
  background: var(--lgw-slate);
  border-radius: var(--lgw-r-2xl);
  padding: 16px;
}
.op-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--lgw-fg);
}
.op-card-desc {
  margin-top: 6px;
  font-size: 13px;
  color: var(--lgw-muted-fg);
  line-height: 1.5;
}
</style>
