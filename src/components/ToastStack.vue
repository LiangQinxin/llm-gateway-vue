<script setup>
import { toastList } from '@/utils/toast'
</script>

<template>
  <Teleport to="body">
    <div class="lgw-toast-wrap">
      <TransitionGroup name="toast">
        <div v-for="t in toastList" :key="t.id" class="lgw-toast" :class="`lgw-toast--${t.type}`">
          <span style="font-weight: 700">
            {{ t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ' }}
          </span>
          <span>{{ t.msg }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  transform: translateX(110%);
  opacity: 0;
}
</style>
