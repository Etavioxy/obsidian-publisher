<script setup lang="ts">
import { useThemeStore } from '../stores/theme'

const theme = useThemeStore()
</script>

<template>
  <button class="theme-toggle" :title="theme.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" @click="theme.toggle()">
    <span class="vpi-icon">
      <span v-if="theme.theme === 'dark'" class="vpi-moon" />
      <span v-else class="vpi-sun" />
    </span>
  </button>
</template>

<style scoped>
.theme-toggle {
  all: unset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  cursor: pointer;
  transition: all 0.3s;
}

.theme-toggle:hover {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-bg);
}

.vpi-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--vp-c-text-1);
}

.vpi-sun,
.vpi-moon {
  display: inline-block;
  width: 18px;
  height: 18px;
  background-color: currentColor;
  -webkit-mask-image: var(--icon);
  mask-image: var(--icon);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}

.vpi-sun {
  --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3Cpath d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41'/%3E%3C/svg%3E");
}

.vpi-moon {
  --icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'/%3E%3C/svg%3E");
}
</style>
