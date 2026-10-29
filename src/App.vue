<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import ToastStack from '@/components/ToastStack.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.apply()
})
</script>

<template>
  <RouterView />
  <ToastStack />
  <ConfirmDialog />
</template>
