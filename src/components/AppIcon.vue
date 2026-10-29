<script setup>
import { computed } from 'vue'
import { svgIcons } from '@/utils/icons'

const props = defineProps({
  name: { type: String, default: 'dashboard' },
  size: { type: Number, default: 16 },
})

const inner = computed(() => svgIcons[props.name] || svgIcons.dashboard)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="inner"
  />
</template>
