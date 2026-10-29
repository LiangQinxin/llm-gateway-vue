<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchApiKeys, fetchChannels } from '@/api/gateway'
import { escapeHtml, copyToClipboard } from '@/utils/format'
import { notify } from '@/utils/toast'
import AppIcon from '@/components/AppIcon.vue'

const apiKeys = ref([])
const channels = ref([])

const baseUrl = computed(() => location.protocol + '//' + location.host + '/v1')

// 在线测试
const testKey = ref('')
const testModel = ref('')
const testMessage = ref('Hello, how are you?')
const testLoading = ref(false)
const testResult = ref(null) // { ok, html }

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
    // 与原项目一致：直接请求 /v1/chat/completions，携带所选 API Key
    const res = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + testKey.value },
      body: JSON.stringify({ model: testModel.value, messages: [{ role: 'user', content: testMessage.value }], stream: false }),
    })
    const data = await res.json()
    if (data.choices && data.choices[0]) {
      testResult.value = {
        ok: true,
        html: `<strong style="color:var(--lgw-green-fg)">响应:</strong> ${escapeHtml(data.choices[0].message.content)}`,
        meta: `Tokens: ${data.usage ? data.usage.total_tokens || 0 : 0} · 耗时: ${data.usage?.duration || '-'}ms`,
      }
    } else {
      testResult.value = { ok: false, html: `<strong style="color:var(--lgw-danger)">错误:</strong> ${escapeHtml(JSON.stringify(data))}` }
    }
  } catch (e) {
    testResult.value = { ok: false, html: `<strong style="color:var(--lgw-danger)">请求失败:</strong> ${escapeHtml(e.message)}` }
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
      return `<span class="cm"># OpenAI Chat API - cURL</span>
<span class="kw">curl</span> -X POST <span class="st">"${baseUrl.value}/chat/completions"</span> \\
  -H <span class="st">"Content-Type: application/json"</span> \\
  -H <span class="st">"Authorization: Bearer ${key}"</span> \\
  -d <span class="st">'{"model":"${model}","messages":[{"role":"user","content":"Hello!"}],"stream":false}'</span>`
    if (l === 'javascript')
      return `<span class="cm">// OpenAI Chat API - JavaScript</span>
<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/chat/completions"</span>, {
  method: <span class="st">"POST"</span>,
  headers: {<span class="st">"Content-Type"</span>:<span class="st">"application/json"</span>,<span class="st">"Authorization"</span>:<span class="st">"Bearer ${key}"</span>},
  body: <span class="fn">JSON</span>.<span class="fn">stringify</span>({model:<span class="st">"${model}"</span>,messages:[{role:<span class="st">"user"</span>,content:<span class="st">"Hello!"</span>}],stream:<span class="kw">false</span>})
});
<span class="kw">const</span> data = <span class="kw">await</span> res.<span class="fn">json</span>();
<span class="fn">console</span>.<span class="fn">log</span>(data.choices[<span class="nm">0</span>].message.content);`
    if (l === 'typescript')
      return `<span class="cm">// OpenAI Chat API - TypeScript</span>
<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/chat/completions"</span>, {
  method: <span class="st">"POST"</span>,
  headers: {<span class="st">"Content-Type"</span>:<span class="st">"application/json"</span>,<span class="st">"Authorization"</span>:<span class="st">"Bearer ${key}"</span>},
  body: <span class="fn">JSON</span>.<span class="fn">stringify</span>({model:<span class="st">"${model}"</span>,messages:[{role:<span class="st">"user"</span>,content:<span class="st">"Hello!"</span>}]})
});
<span class="kw">const</span> data = <span class="kw">await</span> res.<span class="fn">json</span>() <span class="kw">as</span> {choices:{message:{content:<span class="fn">string</span>}}[]};
<span class="fn">console</span>.<span class="fn">log</span>(data.choices[<span class="nm">0</span>].message.content);`
    if (l === 'java')
      return `<span class="cm">// OpenAI Chat API - Java</span>
<span class="kw">import</span> java.net.http.*;
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
      return `<span class="cm"># OpenAI Responses API - cURL</span>
<span class="kw">curl</span> -X POST <span class="st">"${baseUrl.value}/responses"</span> \\
  -H <span class="st">"Authorization: Bearer ${key}"</span> \\
  -d <span class="st">'{"model":"${model}","input":"Hello!"}'</span>`
    if (l === 'javascript')
      return `<span class="cm">// OpenAI Responses API - JavaScript</span>
<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/responses"</span>, {
  method: <span class="st">"POST"</span>,
  headers: {<span class="st">"Authorization"</span>:<span class="st">"Bearer ${key}"</span>},
  body: <span class="fn">JSON</span>.<span class="fn">stringify</span>({model:<span class="st">"${model}"</span>,input:<span class="st">"Hello!"</span>})
});
<span class="kw">const</span> data = <span class="kw">await</span> res.<span class="fn">json</span>();
<span class="fn">console</span>.<span class="fn">log</span>(data.output);`
    if (l === 'typescript')
      return `<span class="cm">// OpenAI Responses API - TypeScript</span>
<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/responses"</span>, {
  method: <span class="st">"POST"</span>,
  headers: {<span class="st">"Authorization"</span>:<span class="st">"Bearer ${key}"</span>},
  body: <span class="fn">JSON</span>.<span class="fn">stringify</span>({model:<span class="st">"${model}"</span>,input:<span class="st">"Hello!"</span>})
});
<span class="kw">const</span> data = <span class="kw">await</span> res.<span class="fn">json</span>() <span class="kw">as</span> {output:<span class="fn">any</span>};
<span class="fn">console</span>.<span class="fn">log</span>(data.output);`
    if (l === 'java')
      return `<span class="cm">// OpenAI Responses API - Java</span>
<span class="kw">import</span> java.net.http.*;
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
      return `<span class="cm"># Anthropic Messages API - cURL</span>
<span class="kw">curl</span> -X POST <span class="st">"${baseUrl.value}/messages"</span> \\
  -H <span class="st">"x-api-key: ${key}"</span> \\
  -H <span class="st">"anthropic-version: 2023-06-01"</span> \\
  -d <span class="st">'{"model":"claude-sonnet-4-20250514","max_tokens":1024,"messages":[{"role":"user","content":"Hello!"}]}'</span>`
    if (l === 'javascript')
      return `<span class="cm">// Anthropic Messages API - JavaScript</span>
<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/messages"</span>, {
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
      return `<span class="cm">// Anthropic Messages API - TypeScript</span>
<span class="kw">const</span> res = <span class="kw">await</span> <span class="fn">fetch</span>(<span class="st">"${baseUrl.value}/messages"</span>, {
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
      return `<span class="cm">// Anthropic Messages API - Java</span>
<span class="kw">import</span> java.net.http.*;
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
  <div class="lgw-page">
    <div class="lgw-page-head">
      <div>
        <div class="lgw-page-title">接入示例</div>
        <div class="lgw-page-sub">API 对接指南与在线测试</div>
      </div>
    </div>

    <!-- Base URL -->
    <div class="lgw-panel lgw-panel-pad" style="margin-bottom: 16px">
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
        <span style="font-weight: 700; font-size: 13px">Base URL</span>
        <code
          style="flex: 1; background: var(--lgw-slate); border: 1px solid var(--lgw-line); border-radius: var(--lgw-r); padding: 10px 14px; font-family: monospace; font-size: 13px; color: var(--lgw-fg); min-width: 200px"
        >
          {{ baseUrl }}
        </code>
        <button class="lgw-btn lgw-btn--soft lgw-btn--sm" @click="copyBaseUrl()">
          <AppIcon name="copy" /> 复制
        </button>
      </div>
    </div>

    <!-- 在线测试 + 协议语言 -->
    <div class="lgw-grid lgw-grid-2" style="margin-bottom: 16px">
      <div class="lgw-panel lgw-panel-pad">
        <div style="font-weight: 700; margin-bottom: 12px">在线测试</div>
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
        <button class="lgw-btn lgw-btn--primary" :disabled="testLoading" @click="runTest()">
          <span v-if="testLoading" class="lgw-spinner" />
          <AppIcon v-else name="send" />
          发送测试
        </button>
        <div v-if="testResult" style="margin-top: 14px">
          <div
            class="test-result"
            :style="testResult.ok
              ? { background: 'var(--lgw-green-bg)', borderColor: 'var(--lgw-success)', color: 'var(--lgw-fg)' }
              : { background: 'var(--lgw-danger-l)', borderColor: 'var(--lgw-danger)' }"
          >
            <div v-html="testResult.html" />
          </div>
          <div v-if="testResult.ok" style="font-size: 11px; color: var(--lgw-muted-fg); margin-top: 6px">
            {{ testResult.meta }}
          </div>
        </div>
      </div>

      <div class="lgw-panel lgw-panel-pad">
        <div style="font-weight: 700; margin-bottom: 12px">协议与语言</div>
        <div style="font-size: 12px; font-weight: 600; color: var(--lgw-muted-fg); margin-bottom: 8px">协议</div>
        <div class="lgw-tabs" style="margin-bottom: 16px">
          <div
            v-for="p in protocols"
            :key="p.id"
            class="lgw-tab"
            :class="{ active: activeProtocol === p.id }"
            @click="activeProtocol = p.id"
          >
            {{ p.label }}
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: var(--lgw-muted-fg); margin-bottom: 8px">语言</div>
        <div class="lgw-lang-tabs">
          <div
            v-for="l in langOptions"
            :key="l"
            class="lgw-lang-tab"
            :class="{ active: activeLang === l }"
            @click="activeLang = l"
          >
            {{ langLabel(l) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 代码示例 -->
    <div class="lgw-panel lgw-panel-pad">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
        <span style="font-weight: 700">代码示例</span>
        <button class="lgw-btn lgw-btn--soft lgw-btn--sm" @click="copyCode()">
          <AppIcon name="copy" /> 复制代码
        </button>
      </div>
      <div class="lgw-codeblock" v-html="codeHtml" />
    </div>
  </div>
</template>

<style scoped>
.test-result {
  border: 1px solid;
  border-radius: var(--lgw-r);
  padding: 14px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}
</style>
