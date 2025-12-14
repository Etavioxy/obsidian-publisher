<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <div class="text-card">
    <div v-if="title || subtitle" class="header">
      <h3 v-if="title">{{ title }}</h3>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.text-card {
  padding: 16px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  transition: border-color 0.3s;
}

.text-card:hover {
  border-color: var(--vp-c-brand-2);
}

.header {
  margin-bottom: 12px;
}

.header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.content {
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

@media (min-width: 640px) {
  .text-card {
    padding: 20px;
  }
}
</style>
