<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { login } from '@/api/gateway'
import { extractToken } from '@/utils/format'
import AppIcon from '@/components/AppIcon.vue'

const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()

const username = ref('')
const password = ref('')
const pwdVisible = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const successFlag = ref(false)

function togglePwd() {
  pwdVisible.value = !pwdVisible.value
}

async function doLogin() {
  if (loading.value) return
  const u = username.value.trim()
  const p = password.value.trim()

  if (!u || !p) {
    errorMsg.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  errorMsg.value = ''
  successFlag.value = false

  try {
    // POST /api/v1/login（不带令牌，由请求拦截器排除）
    const res = await login(u, p)
    if (res.code === '0000') {
      // 登录成功：保留后端返回的 token（兼容多种返回结构）
      const token = extractToken(res)
      userStore.setToken(token)
      userStore.setUserInfo(res.data || null)
      successFlag.value = true
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } else {
      errorMsg.value = res.info || '用户名或密码错误'
      loading.value = false
    }
  } catch (err) {
    errorMsg.value = '网络错误，请稍后重试'
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg" />

    <button class="theme-btn" title="切换主题" @click="themeStore.toggle()">
      <AppIcon :name="themeStore.mode === 'dark' ? 'sun' : 'moon'" :size="16" />
    </button>

    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo-mark">L</div>
        <div class="login-logo-text">
          <h1>LLMAPI</h1>
        </div>
      </div>

      <form @submit.prevent="doLogin">
        <div class="form-group">
          <label class="form-label" for="login-username">用户名</label>
          <div class="form-input-wrap">
            <span class="form-input-icon"><AppIcon name="user" :size="18" /></span>
            <input
              id="login-username"
              v-model="username"
              class="form-input"
              type="text"
              placeholder="请输入用户名"
              autocomplete="username"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="login-password">密码</label>
          <div class="form-input-wrap">
            <span class="form-input-icon"><AppIcon name="lock" :size="18" /></span>
            <input
              id="login-password"
              v-model="password"
              class="form-input"
              :type="pwdVisible ? 'text' : 'password'"
              placeholder="请输入密码"
              autocomplete="current-password"
            />
            <button type="button" class="pwd-toggle" title="显示/隐藏密码" @click="togglePwd()">
              <AppIcon :name="pwdVisible ? 'eyeOff' : 'eye'" :size="16" />
            </button>
          </div>
        </div>

        <button type="submit" class="btn-login" :disabled="loading">
          <span v-if="loading" class="spinner" />
          <span>{{ successFlag ? '✓ 登录成功' : '登 录' }}</span>
        </button>

        <div v-if="errorMsg" class="error-msg">
          <AppIcon name="warn" :size="16" />
          <span>{{ errorMsg }}</span>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--lgw-bg-grad);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
}

.login-bg {
  position: absolute;
  inset: 0;
  background: url('/texture/d7a19c5b2ba5f2493690293564fed31c.png') center / cover no-repeat;
}

/* 主题切换 */
.theme-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 38px;
  height: 38px;
  border-radius: var(--lgw-r-full);
  background: var(--lgw-card);
  border: 1px solid var(--lgw-line);
  box-shadow: var(--lgw-sh-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lgw-muted-fg);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  z-index: 10;
}
.theme-btn:hover {
  color: var(--lgw-primary);
  border-color: rgba(47, 111, 237, 0.3);
}

/* 登录卡片 */
.login-card {
  position: relative;
  z-index: 1;
  width: 420px;
  max-width: calc(100vw - 32px);
  background: var(--lgw-card);
  border: 1px solid var(--lgw-line);
  border-radius: var(--lgw-r-2xl);
  box-shadow: var(--lgw-sh-xl);
  padding: 40px 36px;
  animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(24px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.login-logo {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.login-logo-mark {
  width: 48px;
  height: 48px;
  border-radius: var(--lgw-r-lg);
  background: linear-gradient(135deg, #3478f6, #2f6fed);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 22px;
  box-shadow: var(--lgw-sh-primary);
  flex-shrink: 0;
}
.login-logo-text h1 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
}

/* 表单 */
.form-group {
  margin-bottom: 20px;
}
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--lgw-fg);
  margin-bottom: 8px;
}
.form-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.form-input-icon {
  position: absolute;
  left: 14px;
  color: var(--lgw-muted-fg);
  pointer-events: none;
  display: flex;
  align-items: center;
}
.form-input {
  width: 100%;
  padding: 12px 14px 12px 42px;
  border: 1.5px solid var(--lgw-line-strong);
  border-radius: var(--lgw-r-lg);
  font-size: 14px;
  color: var(--lgw-fg);
  background: var(--lgw-card);
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
}
.form-input::placeholder {
  color: var(--lgw-muted-fg);
  opacity: 0.7;
}
.form-input:focus {
  border-color: var(--lgw-primary);
  box-shadow: 0 0 0 3px var(--lgw-primary-ll);
}
[data-theme='dark'] .form-input {
  background: var(--lgw-muted);
}

.pwd-toggle {
  position: absolute;
  right: 12px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lgw-muted-fg);
  border-radius: var(--lgw-r-sm);
  transition: color 0.2s, background 0.2s;
}
.pwd-toggle:hover {
  color: var(--lgw-primary);
  background: var(--lgw-primary-ll);
}

/* 登录按钮 */
.btn-login {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: var(--lgw-r-lg);
  background: linear-gradient(135deg, #3478f6, #2f6fed);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
  box-shadow: var(--lgw-sh-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
.btn-login:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(47, 111, 237, 0.3);
}
.btn-login:active {
  transform: translateY(0);
}
.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 错误提示 */
.error-msg {
  margin-top: 16px;
  padding: 10px 14px;
  background: var(--lgw-danger-l);
  border: 1px solid rgba(220, 76, 100, 0.2);
  border-radius: var(--lgw-r-lg);
  font-size: 13px;
  color: var(--lgw-danger);
  display: flex;
  align-items: center;
  gap: 8px;
  animation: shake 0.3s ease;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
    border-radius: var(--lgw-r-xl);
  }
  .login-logo-mark {
    width: 42px;
    height: 42px;
    font-size: 19px;
  }
  .login-logo-text h1 {
    font-size: 20px;
  }
}
</style>
