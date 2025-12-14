<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    name: string
    size?: 'small' | 'medium' | 'large'
    src?: string
  }>(),
  { size: 'medium' }
)

const initial = props.name.charAt(0).toUpperCase()
</script>

<template>
  <div class="avatar" :class="size">
    <img v-if="src" :src="src" :alt="name" />
    <div v-else class="initial">{{ initial }}</div>
  </div>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: var(--vp-c-brand-2);
  color: white;
  font-weight: 600;
  flex-shrink: 0;
}

.avatar.small {
  width: 32px;
  height: 32px;
  font-size: 14px;
}

.avatar.medium {
  width: 48px;
  height: 48px;
  font-size: 18px;
}

.avatar.large {
  width: 64px;
  height: 64px;
  font-size: 24px;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar .initial {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
