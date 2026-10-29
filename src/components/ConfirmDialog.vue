<script setup>
import { confirmState, closeConfirm } from '@/utils/dialog'
import AppIcon from './AppIcon.vue'

function onOk() {
  const fn = confirmState.onOk
  closeConfirm()
  if (typeof fn === 'function') fn()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="confirmState.open" class="lgw-dialog-overlay" @click.self="closeConfirm()">
      <div class="lgw-dialog" style="max-width: 420px">
        <div class="lgw-dialog-head">
          <div class="lgw-dialog-title" style="display: flex; align-items: center; gap: 8px; color: var(--lgw-danger)">
            <AppIcon name="warn" :size="18" />
            {{ confirmState.title }}
          </div>
          <button class="lgw-btn lgw-btn--ghost lgw-btn--icon" aria-label="关闭" @click="closeConfirm()">
            <AppIcon name="close" />
          </button>
        </div>
        <div class="lgw-dialog-body">
          <div style="font-size: 14px; color: var(--lgw-muted-fg)">
            <span v-html="confirmState.body" />
          </div>
          <div style="font-size: 12px; color: var(--lgw-muted-fg); margin-top: 8px">此操作不可撤销。</div>
        </div>
        <div class="lgw-dialog-actions">
          <button class="lgw-btn lgw-btn--soft" @click="closeConfirm()">取消</button>
          <button class="lgw-btn lgw-btn--danger" @click="onOk()">确认</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
