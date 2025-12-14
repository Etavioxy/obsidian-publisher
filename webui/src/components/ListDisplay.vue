<script setup lang="ts" generic="T">
defineProps<{
  items: T[]
  emptyText?: string
}>()
</script>

<template>
  <div class="list-display">
    <slot v-if="items.length" name="default" :items="items" />
    <p v-else class="empty">{{ emptyText ?? 'No items' }}</p>
  </div>
</template>

<style scoped>
.list-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty {
  color: var(--vp-c-text-2);
  font-style: italic;
}
</style>
