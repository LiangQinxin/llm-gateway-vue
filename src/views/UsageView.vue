<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchApiKeys, fetchChannels } from '@/api/gateway'
import { escapeHtml, copyToClipboard } from '@/utils/format'
import { notify } from '@/utils/toast'
import AppIcon from '@/components/AppIcon.vue'

const apiKeys = ref([])
const channels = ref([])

// 接入示例 BaseUrl：生产环境优先使用 .env.production 配置的对外域名（如 http://790321.xyz/v1），本地开发回退为当前访问地址
const baseUrl = computed(() => import.meta.env.VITE_PUBLIC_BASE_URL || location.protocol + '//' + location.host + '/v1')

// 在线测试
const testKey = ref('')
const testModel = ref('')
const testMessage = ref('Hello, how are you?')
const testLoading = ref(false)
const testResult = ref(null) // { ok, html, meta }

const models = computed(() => [...new Set(channels.value.flatMap((c) => c.models || []))])

// 协议与语言
const protocols = [
  { id: 'chat', label: 'OpenAI Chat' },
  { id: 'responses', label: 'OpenAI Responses' },
  { id: 'anthropic', label: 'Anthropic Messages' },
]
const langOptions = ['curl', 'javascript', 'typescript', 'java']
const activeProtocol = ref('chat')
const activeLang = ref('curl')

// 协议 → 端点路径 / 徽标样式
const protocolMeta = {
  chat: { path: '/chat/completions', cls: 'p-blue', desc: 'OpenAI 兼容对话接口' },
  responses: { path: '/responses', cls: 'p-violet', desc: 'OpenAI Responses 接口' },
  anthropic: { path: '/messages', cls: 'p-rose', desc: 'Anthropic 消息接口' },
}
const endpointLabel = computed(() => 'POST ' + (protocolMeta[activeProtocol.value]?.path || ''))
const protocolDesc = computed(() => protocolMeta[activeProtocol.value]?.desc || '')

// 语言 → 徽标 / 文件名
const langMeta = {
  curl: { label: 'cURL', cls: 'l-slate', file: 'curl.sh' },
  javascript: { label: 'JS', cls: 'l-amber', file: 'example.js' },
  typescript: { label: 'TS', cls: 'l-blue', file: 'example.ts' },
  java: { label: 'JAVA', cls: 'l-rose', file: 'Example.java' },
}
const activeLangMeta = computed(() => langMeta[activeLang.value] || langMeta.curl)
const codeFileName = computed(() => activeLangMeta.value.file)

function langLabel(l) {
  return l === 'curl' ? 'cURL' : l.charAt(0).toUpperCase() + l.slice(1)
}

async function loadOptions() {
  const [rk, rc] = await Promise.all([fetchApiKeys(), fetchChannels()])
  if (rk.code === '0000') apiKeys.value = rk.data || []
  if (rc.code === '0000') channels.value = rc.data || []
  if (!testKey.value && apiKeys.value.length) testKey.value = apiKeys.value[0].key || apiKeys.value[0].apiKey || ''
  if (!testModel.value && models.value.length) testModel.value = models.value[0]
}

async function runTest() {
  if (!testKey.value) {
    notify('请先选择 API Key', 'error')
    return
  }
  if (!testModel.value) {
    notify('请输入模型名称', 'error')
    return
  }
  testLoading.value = true
  testResult.value = null
  try {
    // 直接请求 /v1/chat/completions，携带所选 API Key
    const res = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + testKey.value },
      body: JSON.stringify({ model: testModel.value, messages: [{ role: 'user', content: testMessage.value }], stream: false }),
    })
    const data = await res.json()
    if (data.choices && data.choices[0]) {
      testResult.value = {
        ok: true,
        html: escapeHtml(data.choices[0].message.content),
        meta: `Tokens: ${data.usage ? data.usage.total_tokens || 0 : 0} · 耗时: ${data.usage?.duration || '-'}ms`,
      }
    } else {
      testResult.value = { ok: false, html: escapeHtml(JSON.stringify(data)) }
    }
  } catch (e) {
    testResult.value = { ok: false, html: escapeHtml(e.message) }
  }
  testLoading.value = false
}

// 代码示例（含语法高亮 span）
const codeHtml = computed(() => {
  const key = 'sk-your-api-key'
  const model = 'gpt-4o'
  const p = activeProtocol.value
  const l = activeLang.value

  if (p === 'chat') {
    if (l === 'curl')
      return `<span class="kw">curl</span> -X POST <span class="st">"${baseUrl.value}/chat/completions"</span> \\
  -H <span class="st">"Content-Type: application/json"</span> \\
  -H <span class="st">"Authorization: Bearer ${key}"</span> \\
  -d <span class="st">'{"model":"${model}","messages":[{"role":"user","content":"Hello!"}],"stream":false}'</span>`
    if (l === 'javascript')
      return `<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/chat/completions"</span>, {
  method: <span class="st">"POST"</span>,
  headers: {<span class="st">"Content-Type"</span>:<span class="st">"application/json"</span>,<span class="st">"Authorization"</span>:<span class="st">"Bearer ${key}"</span>},
  body: <span class="fn">JSON</span>.<span class="fn">stringify</span>({model:<span class="st">"${model}"</span>,messages:[{role:<span class="st">"user"</span>,content:<span class="st">"Hello!"</span>}],stream:<span class="kw">false</span>})
});
<span class="kw">const</span> data = <span class="kw">await</span> res.<span class="fn">json</span>();
<span class="fn">console</span>.<span class="fn">log</span>(data.choices[<span class="nm">0</span>].message.content);`
    if (l === 'typescript')
      return `<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/chat/completions"</span>, {
  method: <span class="st">"POST"</span>,
  headers: {<span class="st">"Content-Type"</span>:<span class="st">"application/json"</span>,<span class="st">"Authorization"</span>:<span class="st">"Bearer ${key}"</span>},
  body: <span class="fn">JSON</span>.<span class="fn">stringify</span>({model:<span class="st">"${model}"</span>,messages:[{role:<span class="st">"user"</span>,content:<span class="st">"Hello!"</span>}]})
});
<span class="kw">const</span> data = <span class="kw">await</span> res.<span class="fn">json</span>() <span class="kw">as</span> {choices:{message:{content:<span class="fn">string</span>}}[]};
<span class="fn">console</span>.<span class="fn">log</span>(data.choices[<span class="nm">0</span>].message.content);`
    if (l === 'java')
      return `<span class="kw">import</span> java.net.http.*;
<span class="fn">HttpClient</span> client = <span class="fn">HttpClient</span>.<span class="fn">newHttpClient</span>();
<span class="fn">HttpRequest</span> req = <span class="fn">HttpRequest</span>.<span class="fn">newBuilder</span>()
    .<span class="fn">uri</span>(<span class="fn">URI</span>.<span class="fn">create</span>(<span class="st">"${baseUrl.value}/chat/completions"</span>))
    .<span class="fn">header</span>(<span class="st">"Authorization"</span>, <span class="st">"Bearer ${key}"</span>)
    .<span class="fn">POST</span>(<span class="fn">BodyPublishers</span>.<span class="fn">ofString</span>(<span class="st">"{\\"model\\":\\"${model}\\",\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"Hello!\\"}]}"</span>))
    .<span class="fn">build</span>();
<span class="fn">System</span>.out.<span class="fn">println</span>(client.<span class="fn">send</span>(req, <span class="fn">BodyHandlers</span>.<span class="fn">ofString</span>()).<span class="fn">body</span>());`
  }

  if (p === 'responses') {
    if (l === 'curl')
      return `<span class="kw">curl</span> -X POST <span class="st">"${baseUrl.value}/responses"</span> \\
  -H <span class="st">"Authorization: Bearer ${key}"</span> \\
  -d <span class="st">'{"model":"${model}","input":"Hello!"}'</span>`
    if (l === 'javascript')
      return `<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/responses"</span>, {
  method: <span class="st">"POST"</span>,
  headers: {<span class="st">"Authorization"</span>:<span class="st">"Bearer ${key}"</span>},
  body: <span class="fn">JSON</span>.<span class="fn">stringify</span>({model:<span class="st">"${model}"</span>,input:<span class="st">"Hello!"</span>})
});
<span class="kw">const</span> data = <span class="kw">await</span> res.<span class="fn">json</span>();
<span class="fn">console</span>.<span class="fn">log</span>(data.output);`
    if (l === 'typescript')
      return `<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/responses"</span>, {
  method: <span class="st">"POST"</span>,
  headers: {<span class="st">"Authorization"</span>:<span class="st">"Bearer ${key}"</span>},
  body: <span class="fn">JSON</span>.<span class="fn">stringify</span>({model:<span class="st">"${model}"</span>,input:<span class="st">"Hello!"</span>})
});
<span class="kw">const</span> data = <span class="kw">await</span> res.<span class="fn">json</span>() <span class="kw">as</span> {output:<span class="fn">any</span>};
<span class="fn">console</span>.<span class="fn">log</span>(data.output);`
    if (l === 'java')
      return `<span class="kw">import</span> java.net.http.*;
<span class="fn">HttpClient</span> client = <span class="fn">HttpClient</span>.<span class="fn">newHttpClient</span>();
<span class="fn">HttpRequest</span> req = <span class="fn">HttpRequest</span>.<span class="fn">newBuilder</span>()
    .<span class="fn">uri</span>(<span class="fn">URI</span>.<span class="fn">create</span>(<span class="st">"${baseUrl.value}/responses"</span>))
    .<span class="fn">header</span>(<span class="st">"Authorization"</span>, <span class="st">"Bearer ${key}"</span>)
    .<span class="fn">POST</span>(<span class="fn">BodyPublishers</span>.<span class="fn">ofString</span>(<span class="st">"{\\"model\\":\\"${model}\\",\\"input\\":\\"Hello!\\"}"</span>))
    .<span class="fn">build</span>();
<span class="fn">System</span>.out.<span class="fn">println</span>(client.<span class="fn">send</span>(req, <span class="fn">BodyHandlers</span>.<span class="fn">ofString</span>()).<span class="fn">body</span>());`
  }

  if (p === 'anthropic') {
    if (l === 'curl')
      return `<span class="kw">curl</span> -X POST <span class="st">"${baseUrl.value}/messages"</span> \\
  -H <span class="st">"x-api-key: ${key}"</span> \\
  -H <span class="st">"anthropic-version: 2023-06-01"</span> \\
  -d <span class="st">'{"model":"claude-sonnet-4-20250514","max_tokens":1024,"messages":[{"role":"user","content":"Hello!"}]}'</span>`
    if (l === 'javascript')
      return `<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/messages"</span>, {
  method: <span class="st">"POST"</span>,
  headers: {
    <span class="st">"x-api-key"</span>:<span class="st">"${key}"</span>,
    <span class="st">"anthropic-version"</span>:<span class="st">"2023-06-01"</span>,
    <span class="st">"Content-Type"</span>:<span class="st">"application/json"</span>
  },
  body: <span class="fn">JSON</span>.<span class="fn">stringify</span>({model:<span class="st">"claude-sonnet-4-20250514"</span>,max_tokens:<span class="nm">1024</span>,messages:[{role:<span class="st">"user"</span>,content:<span class="st">"Hello!"</span>}]})
});
<span class="kw">const</span> data = <span class="kw">await</span> res.<span class="fn">json</span>();
<span class="fn">console</span>.<span class="fn">log</span>(data.content[<span class="nm">0</span>].text);`
    if (l === 'typescript')
      return `<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/messages"</span>, {
  method: <span class="st">"POST"</span>,
  headers: {
    <span class="st">"x-api-key"</span>:<span class="st">"${key}"</span>,
    <span class="st">"anthropic-version"</span>:<span class="st">"2023-06-01"</span>,
    <span class="st">"Content-Type"</span>:<span class="st">"application/json"</span>
  },
  body: <span class="fn">JSON</span>.<span class="fn">stringify</span>({model:<span class="st">"claude-sonnet-4-20250514"</span>,max_tokens:<span class="nm">1024</span>,messages:[{role:<span class="st">"user"</span>,content:<span class="st">"Hello!"</span>}]})
});
<span class="kw">const</span> data = <span class="kw">await</span> res.<span class="fn">json</span>() <span class="kw">as</span> {content:{text:<span class="fn">string</span>}[]};
<span class="fn">console</span>.<span class="fn">log</span>(data.content[<span class="nm">0</span>].text);`
    if (l === 'java')
      return `<span class="kw">import</span> java.net.http.*;
<span class="fn">HttpClient</span> client = <span class="fn">HttpClient</span>.<span class="fn">newHttpClient</span>();
<span class="fn">HttpRequest</span> req = <span class="fn">HttpRequest</span>.<span class="fn">newBuilder</span>()
    .<span class="fn">uri</span>(<span class="fn">URI</span>.<span class="fn">create</span>(<span class="st">"${baseUrl.value}/messages"</span>))
    .<span class="fn">header</span>(<span class="st">"x-api-key"</span>, <span class="st">"${key}"</span>)
    .<span class="fn">header</span>(<span class="st">"anthropic-version"</span>, <span class="st">"2023-06-01"</span>)
    .<span class="fn">POST</span>(<span class="fn">BodyPublishers</span>.<span class="fn">ofString</span>(<span class="st">"{\\"model\\":\\"claude-sonnet-4-20250514\\",\\"max_tokens\\":1024,\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"Hello!\\"}]}"</span>))
    .<span class="fn">build</span>();
<span class="fn">System</span>.out.<span class="fn">println</span>(client.<span class="fn">send</span>(req, <span class="fn">BodyHandlers</span>.<span class="fn">ofString</span>()).<span class="fn">body</span>());`
  }
  return ''
})

function copyCode() {
  // 从高亮 HTML 中提取纯文本
  const div = document.createElement('div')
  div.innerHTML = codeHtml.value
  copyToClipboard(div.textContent || '').then((ok) => notify(ok ? '代码已复制' : '复制失败', ok ? 'success' : 'error'))
}

function copyBaseUrl() {
  copyToClipboard(baseUrl.value).then((ok) => notify(ok ? '已复制到剪贴板' : '复制失败', ok ? 'success' : 'error'))
}

onMounted(loadOptions)
</script>

<template>
  <div class="lgw-page usage-page">
    <div class="lgw-page-head">
      <div>
        <div class="usage-title-row">
          <span class="usage-kicker"><AppIcon name="usage" :size="14" /> API 指南</span>
          <h2 class="lgw-page-title">接入示例</h2>
        </div>
        <div class="lgw-page-sub">API 对接指南与在线测试 · 选择协议与语言，直接复制可运行代码</div>
      </div>
      <div class="usage-head-badges">
        <span class="usage-badge b-blue"><AppIcon name="server" :size="13" /> API v1</span>
        <span class="usage-badge b-slate">OpenAI · Anthropic 兼容</span>
      </div>
    </div>

    <!-- Base URL -->
    <div class="usage-endpoint">
      <div class="usage-ep-icon"><AppIcon name="server" :size="20" /></div>
      <div class="usage-ep-body">
        <div class="usage-ep-label">API BaseUrl 地址</div>
        <code class="usage-ep-code">{{ baseUrl }}</code>
      </div>
      <button class="lgw-btn lgw-btn--soft lgw-btn--sm" @click="copyBaseUrl()">
        <AppIcon name="copy" /> 复制
      </button>
    </div>

    <!-- 在线测试 + 协议语言 -->
    <div class="usage-grid">
      <div class="lgw-panel usage-card">
        <div class="usage-card-head">
          <div class="usage-card-title">
            <span class="usage-card-icon i-blue"><AppIcon name="test" :size="15" /></span>
            在线测试
          </div>
          <span class="usage-method" :class="protocolMeta[activeProtocol]?.cls">{{ endpointLabel }}</span>
        </div>
        <div class="lgw-field">
          <label class="lgw-field-label">选择 API Key</label>
          <select v-model="testKey" class="lgw-input">
            <option v-for="k in apiKeys" :key="k.id || k.keyId" :value="k.key || k.apiKey">
              {{ k.name }}
            </option>
            <option v-if="!apiKeys.length" value="">请先创建密钥</option>
          </select>
        </div>
        <div class="lgw-field">
          <label class="lgw-field-label">模型</label>
          <select v-model="testModel" class="lgw-input">
            <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
            <option v-if="!models.length" value="">请先配置渠道模型</option>
          </select>
        </div>
        <div class="lgw-field">
          <label class="lgw-field-label">消息内容</label>
          <textarea v-model="testMessage" class="lgw-input" rows="3" placeholder="Hello, how are you?" />
        </div>
        <button class="lgw-btn lgw-btn--primary usage-send" :disabled="testLoading" @click="runTest()">
          <span v-if="testLoading" class="lgw-spinner" />
          <AppIcon v-else name="send" />
          {{ testLoading ? '发送中…' : '发送测试' }}
        </button>
        <div v-if="testResult" class="usage-result">
          <div class="usage-result-box" :class="testResult.ok ? 'ok' : 'err'">
            <span class="usage-result-icon" :class="testResult.ok ? 'ok' : 'err'">
              <AppIcon :name="testResult.ok ? 'check' : 'warn'" :size="14" />
            </span>
            <div class="usage-result-body">
              <div class="usage-result-msg">{{ testResult.html }}</div>
              <div v-if="testResult.ok" class="usage-result-meta">{{ testResult.meta }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="lgw-panel usage-card">
        <div class="usage-card-head">
          <div class="usage-card-title">
            <span class="usage-card-icon i-violet"><AppIcon name="usage" :size="15" /></span>
            协议与语言
          </div>
          <span class="usage-badge b-slate usage-hint">{{ protocolDesc }}</span>
        </div>

        <div class="usage-label">协议</div>
        <div class="usage-seg">
          <div
            v-for="p in protocols"
            :key="p.id"
            class="usage-seg-item"
            :class="{ active: activeProtocol === p.id }"
            @click="activeProtocol = p.id"
          >
            {{ p.label }}
          </div>
        </div>

        <div class="usage-label" style="margin-top: 20px">语言</div>
        <div class="usage-langs">
          <div
            v-for="l in langOptions"
            :key="l"
            class="usage-lang"
            :class="{ active: activeLang === l }"
            @click="activeLang = l"
          >
            <span class="usage-lang-badge" :class="langMeta[l].cls">{{ langMeta[l].label }}</span>
            {{ langLabel(l) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 代码示例 -->
    <div class="lgw-panel usage-card usage-code-card">
      <div class="usage-card-head">
        <div class="usage-card-title">
          <span class="usage-card-icon i-slate"><AppIcon name="logs" :size="15" /></span>
          代码示例
        </div>
        <span class="usage-badge" :class="protocolMeta[activeProtocol]?.cls">{{ protocols.find((p) => p.id === activeProtocol)?.label }} · {{ langLabel(activeLang) }}</span>
      </div>
      <div class="usage-code">
        <div class="usage-code-bar">
          <span class="usage-code-lang" :class="activeLangMeta.cls">{{ activeLangMeta.label }}</span>
          <button class="usage-code-copy" @click="copyCode()">
            <AppIcon name="copy" :size="13" /> 复制代码
          </button>
        </div>
        <div class="usage-code-body" v-html="codeHtml" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 接入示例页 · 整体美化 ===== */

.usage-page {
  --lgw-r-2xl: 16px;
}

/* ---------- 页头 ---------- */
.usage-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.usage-title-row .lgw-page-title {
  font-size: 26px;
  margin: 0;
}
.usage-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--lgw-r-full);
  background: linear-gradient(135deg, var(--lgw-primary), var(--lgw-primary-d));
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: var(--lgw-sh-primary);
  white-space: nowrap;
}
.usage-head-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.usage-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: var(--lgw-r-full);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--lgw-line);
  background: var(--lgw-card);
  color: var(--lgw-muted-fg);
  white-space: nowrap;
}
.usage-badge.b-blue { background: var(--lgw-blue-bg); color: var(--lgw-blue-fg); border-color: rgba(37, 99, 235, .18); }
.usage-badge.b-slate { background: var(--lgw-slate-bg); color: var(--lgw-slate-fg); border-color: var(--lgw-line); }
.usage-badge.p-blue { background: var(--lgw-blue-bg); color: var(--lgw-blue-fg); border-color: rgba(37, 99, 235, .18); }
.usage-badge.p-violet { background: var(--lgw-violet-bg); color: var(--lgw-violet-fg); border-color: rgba(124, 58, 237, .18); }
.usage-badge.p-rose { background: var(--lgw-rose-bg); color: var(--lgw-rose-fg); border-color: rgba(225, 29, 72, .18); }

/* ---------- Base URL 端点卡 ---------- */
.usage-endpoint {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 16px;
  border-radius: var(--lgw-r-2xl);
  border: 1px solid rgba(47, 111, 237, .14);
  background:
    linear-gradient(180deg, var(--lgw-card-soft), var(--lgw-card-soft)),
    var(--lgw-card);
  box-shadow: var(--lgw-sh-md);
  transition: var(--lgw-ease);
}
.usage-endpoint:hover {
  border-color: rgba(47, 111, 237, .3);
  box-shadow: var(--lgw-sh-lg);
}
.usage-ep-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--lgw-r-xl);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(135deg, #3478f6, #2f6fed);
  box-shadow: var(--lgw-sh-primary);
}
.usage-ep-body { flex: 1; min-width: 0; }
.usage-ep-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--lgw-muted-fg);
  margin-bottom: 5px;
}
.usage-ep-code {
  display: block;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
  font-size: 14px;
  color: var(--lgw-fg);
  word-break: break-all;
  user-select: all;
}

/* ---------- 卡片通用 ---------- */
.usage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.usage-card { padding: 20px; }
.usage-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.usage-card-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 15px;
  font-weight: 700;
  color: var(--lgw-fg);
}
.usage-card-icon {
  width: 30px;
  height: 30px;
  border-radius: var(--lgw-r-lg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.usage-card-icon.i-blue { background: var(--lgw-blue-bg); color: var(--lgw-blue-fg); }
.usage-card-icon.i-violet { background: var(--lgw-violet-bg); color: var(--lgw-violet-fg); }
.usage-card-icon.i-slate { background: var(--lgw-slate-bg); color: var(--lgw-slate-fg); }
.usage-method {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--lgw-r-full);
  white-space: nowrap;
}
.usage-method.p-blue { background: var(--lgw-blue-bg); color: var(--lgw-blue-fg); }
.usage-method.p-violet { background: var(--lgw-violet-bg); color: var(--lgw-violet-fg); }
.usage-method.p-rose { background: var(--lgw-rose-bg); color: var(--lgw-rose-fg); }
.usage-hint { font-weight: 500; font-size: 11.5px; }

/* ---------- 发送按钮 / 测试结果 ---------- */
.usage-send {
  width: 100%;
  margin-top: 2px;
  padding: 11px 16px;
}
.usage-result { margin-top: 14px; }
.usage-result-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-radius: var(--lgw-r-xl);
  padding: 13px 14px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}
.usage-result-box.ok {
  background: var(--lgw-green-bg);
  border: 1px solid rgba(5, 150, 105, .25);
  color: var(--lgw-fg);
}
.usage-result-box.err {
  background: var(--lgw-danger-l);
  border: 1px solid rgba(220, 76, 100, .25);
  color: var(--lgw-fg);
}
.usage-result-icon {
  width: 22px;
  height: 22px;
  border-radius: var(--lgw-r-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.usage-result-icon.ok { background: rgba(5, 150, 105, .15); color: var(--lgw-green-fg); }
.usage-result-icon.err { background: rgba(220, 76, 100, .15); color: var(--lgw-danger); }
.usage-result-body { flex: 1; min-width: 0; }
.usage-result-msg { white-space: pre-wrap; }
.usage-result-meta {
  margin-top: 5px;
  font-size: 11px;
  color: var(--lgw-muted-fg);
}

/* ---------- 协议分段控件 ---------- */
.usage-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--lgw-muted-fg);
  margin-bottom: 9px;
  letter-spacing: .01em;
}
.usage-seg {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  border-radius: var(--lgw-r-xl);
  background: var(--lgw-slate-bg);
  border: 1px solid var(--lgw-line);
}
.usage-seg-item {
  padding: 9px 8px;
  text-align: center;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--lgw-muted-fg);
  cursor: pointer;
  transition: var(--lgw-ease);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.usage-seg-item:hover { color: var(--lgw-fg); }
.usage-seg-item.active {
  background: var(--lgw-card);
  color: var(--lgw-primary);
  box-shadow: var(--lgw-sh-md);
}

/* ---------- 语言选择 ---------- */
.usage-langs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.usage-lang {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border-radius: var(--lgw-r-lg);
  border: 1px solid var(--lgw-line);
  background: var(--lgw-card);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--lgw-muted-fg);
  cursor: pointer;
  transition: var(--lgw-ease);
  white-space: nowrap;
  overflow: hidden;
}
.usage-lang:hover {
  border-color: rgba(47, 111, 237, .25);
  color: var(--lgw-fg);
  box-shadow: var(--lgw-sh);
}
.usage-lang.active {
  border-color: rgba(47, 111, 237, .35);
  color: var(--lgw-primary);
  background: var(--lgw-blue-bg);
  box-shadow: var(--lgw-sh);
}
.usage-lang-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  padding: 2px 6px;
  border-radius: var(--lgw-r-sm);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .02em;
  flex-shrink: 0;
}
.usage-lang-badge.l-slate { background: var(--lgw-slate-bg); color: var(--lgw-slate-fg); }
.usage-lang-badge.l-amber { background: var(--lgw-amber-bg); color: var(--lgw-amber-fg); }
.usage-lang-badge.l-blue { background: var(--lgw-blue-bg); color: var(--lgw-blue-fg); }
.usage-lang-badge.l-rose { background: var(--lgw-rose-bg); color: var(--lgw-rose-fg); }
.usage-lang.active .usage-lang-badge.l-slate { background: rgba(71, 85, 105, .15); }
.usage-lang.active .usage-lang-badge.l-amber { background: rgba(217, 119, 6, .15); }
.usage-lang.active .usage-lang-badge.l-blue { background: rgba(37, 99, 235, .15); }
.usage-lang.active .usage-lang-badge.l-rose { background: rgba(225, 29, 72, .15); }

/* ---------- 代码示例（背景与 static 版 .code-block 一致：浅色 #F9F9F9） ---------- */
.usage-code-card { padding: 20px; }
.usage-code {
  border-radius: var(--lgw-r-xl);
  overflow: hidden;
  border: 1px solid var(--lgw-line);
  background: #F9F9F9;
}
.usage-code-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 14px;
  background: #eef0f2;
  border-bottom: 1px solid rgba(120, 90, 40, .10);
}
.usage-code-dots {
  display: inline-flex;
  gap: 6px;
  flex-shrink: 0;
}
.usage-code-dots i {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #d0d4d8;
}
.usage-code-dots i:nth-child(1) { background: #f87171; opacity: .85; }
.usage-code-dots i:nth-child(2) { background: #fbbf24; opacity: .85; }
.usage-code-dots i:nth-child(3) { background: #34d399; opacity: .85; }
.usage-code-file {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 12px;
  color: #57606a;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.usage-code-lang {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .04em;
  padding: 3px 8px;
  border-radius: var(--lgw-r-full);
  background: #e6e8ea;
  color: #57606a;
  flex-shrink: 0;
}
.usage-code-lang.l-amber { background: #fef3c7; color: #b45309; }
.usage-code-lang.l-blue { background: #dbeafe; color: #1d4ed8; }
.usage-code-lang.l-rose { background: #ffe4e6; color: #be123c; }
.usage-code-lang.l-slate { background: #e6e8ea; color: #57606a; }
.usage-code-copy {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: var(--lgw-r);
  border: 1px solid var(--lgw-line);
  background: var(--lgw-card);
  color: var(--lgw-muted-fg);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--lgw-ease);
  flex-shrink: 0;
}
.usage-code-copy:hover {
  background: #fff;
  color: var(--lgw-primary);
  border-color: rgba(47, 111, 237, .35);
  box-shadow: var(--lgw-sh);
}
.usage-code-body {
  padding: 16px 18px;
  color: #1f2328;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.75;
  overflow-x: auto;
  white-space: pre;
  tab-size: 2;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1080px) {
  .usage-grid { grid-template-columns: 1fr 1fr; }
  .usage-langs { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 880px) {
  .usage-grid { grid-template-columns: 1fr; }
  .usage-head-badges { margin-top: 4px; }
}
@media (max-width: 480px) {
  .usage-seg { grid-template-columns: 1fr; }
  .usage-endpoint { flex-wrap: wrap; }
  .usage-endpoint .lgw-btn { width: 100%; }
  .usage-code-body { font-size: 12px; padding: 14px; }
}
</style>

<!-- 代码块语法高亮（GitHub 风格，与 static 版 .code-block 配色一致；v-html 注入内容需非 scoped 才能命中） -->
<style>
.usage-code-body .cm { color: #6e7781; }
.usage-code-body .kw { color: #cf222e; }
.usage-code-body .st { color: #0969da; }
.usage-code-body .fn { color: #8250df; }
.usage-code-body .nm { color: #0550ae; }
</style>
