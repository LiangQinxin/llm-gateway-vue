import gateway from './request'

/**
 * 业务接口模块
 * 统一返回 { code, data, info }，调用方检查 code === '0000'
 */

// ---------- 认证 ----------
export const login = (username, password) => gateway.post('/v1/login', { username, password })
export const logout = () => gateway.post('/v1/logout')

// ---------- 仪表盘 ----------
export const fetchDashboard = () => gateway.get('/v1/dashboard')

// ---------- 渠道管理 ----------
export const fetchChannels = () => gateway.get('/v1/channels')
export const createChannel = (body) => gateway.post('/v1/channels', body)
export const updateChannel = (id, body) => gateway.put(`/v1/channels/${id}`, body)
export const deleteChannel = (id) => gateway.delete(`/v1/channels/${id}`)
export const testChannel = (id) => gateway.post(`/v1/channels/${id}/test`)
export const setChannelStatus = (id, status) => gateway.post(`/v1/channels/${id}/toggle`, { enabled: status === 1 })

// ---------- API 密钥 ----------
export const fetchApiKeys = () => gateway.get('/v1/api-keys')
export const createApiKey = (body) => gateway.post('/v1/api-keys', body)
export const updateApiKey = (id, body) => gateway.put(`/v1/api-keys/${id}`, body)
export const deleteApiKey = (id) => gateway.delete(`/v1/api-keys/${id}`)
export const setApiKeyStatus = (id, status) => gateway.post(`/v1/api-keys/${id}/toggle`, { enabled: status === 1 })

// ---------- 请求日志 ----------
export const fetchLogs = (params) => gateway.get('/v1/logs', { params })
export const clearLogs = () => gateway.delete('/v1/logs/all')
export const deleteLog = (id) => gateway.delete(`/v1/logs/${id}`)

// ---------- 安全审计 ----------
export const fetchBuiltinRules = () => gateway.get('/v1/security/rules/builtin')
export const fetchCustomRules = () => gateway.get('/v1/security/rules/custom')
export const fetchFindings = () => gateway.get('/v1/security/findings')
export const updateBuiltinRule = (id, body) => gateway.put(`/v1/security/rules/builtin/${id}`, body)
export const createCustomRule = (body) => gateway.post('/v1/security/rules/custom', body)
export const updateCustomRule = (id, body) => gateway.put(`/v1/security/rules/custom/${id}`, body)
export const deleteCustomRule = (id) => gateway.delete(`/v1/security/rules/custom/${id}`)
export const deleteFinding = (id) => gateway.delete(`/v1/security/findings/${id}`)
export const clearFindings = () => gateway.delete('/v1/security/findings/all')
