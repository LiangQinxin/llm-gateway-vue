<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: Number, default: 480 },
})

const emit = defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="lgw-dialog-overlay" @click.self="emit('close')">
      <div class="lgw-dialog" :style="{ maxWidth: width + 'px' }">
        <div class="lgw-dialog-head">
          <div class="lgw-dialog-title">{{ title }}</div>
          <button class="lgw-btn lgw-btn--ghost lgw-btn--icon" aria-label="关闭" @click="emit('close')">
            <AppIcon name="close" />
          </button>
        </div>
        <div class="lgw-dialog-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="lgw-dialog-actions">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
