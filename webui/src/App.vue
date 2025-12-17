<script setup lang="ts">
import ThemeToggle from './components/ThemeToggle.vue'
import GitHubLink from './components/GitHubLink.vue'
import NavMenu from './components/NavMenu.vue'
</script>

<template>
  <div class="app">
    <NavMenu />
    <div class="app-controls">
      <ThemeToggle />
      <GitHubLink />
    </div>
    <router-view />
  </div>
</template>

<style>
:root {
  color-scheme: light dark;
}

html.dark {
  color-scheme: dark;
}

.app {
  width: 100%;
  min-height: 100vh;
}

.app-controls {
  position: fixed;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  z-index: 1000;
}
</style>
