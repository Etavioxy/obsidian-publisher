<script setup lang="ts">
import RadialMenu from './RadialMenu.vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { computed } from 'vue'
import { shouldShowDemoNav } from '../demo.config'

interface RadialNavItem {
  id: string
  icon: string
  title: string
  url: string
}

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const showNav = computed(() => {
  // route.meta.showNav === false will hide
  return route.meta?.showNav !== false
})

const items = computed<RadialNavItem[]>(() => {
  const base: RadialNavItem[] = [
    { id: 'home', icon: 'fa fa-home', title: 'Home', url: '#' },
    { id: 'dashboard', icon: 'fa fa-bell', title: 'Dashboard', url: '#' },
    { id: 'about', icon: 'fa fa-info-circle', title: 'About', url: '#' },
  ]

  if (shouldShowDemoNav()) {
    base.push({ id: 'radial-demo', icon: 'fa fa-star', title: 'Radial Demo', url: '#' })
  }

  if (auth.token) {
    base.push({ id: 'logout', icon: 'fa fa-user', title: 'Logout', url: '#' })
  } else {
    base.push({ id: 'login', icon: 'fa fa-user', title: 'Login', url: '#' })
  }

  return base
})


const handleItemClick = (item: RadialNavItem) => {
  switch (item.id) {
    case 'home':
      void router.push('/')
      break
    case 'dashboard':
      void router.push('/dashboard')
      break
    case 'about':
      void router.push('/about')
      break
    case 'radial-demo':
      void router.push('/radial-demo')
      break
    case 'logout':
      auth.logout()
      void router.push('/login')
      break
    case 'login':
      void router.push('/login')
      break
  }
}
</script>

<template>
  <div v-if="showNav" class="navmenu-root">
    <RadialMenu 
      :items="items" 
      :item-padding="18"
      :padding="12 + 16 - 2"
      :inner-radius="80" 
      :radius="200" 
      :items-per-page="10" 
      position="top-left"
      :open-on-hover="true"
      :auto-close-on-click="true"
      :show-arrows="true"
      background-color="var(--vp-c-bg-elv)"
      menu-color="var(--vp-c-bg-soft)"
      text-color="var(--vp-c-text-2)"
      hover-color="var(--vp-c-brand-2)"
      border-color="var(--vp-c-border)"
      @item-click="handleItemClick"
    />
  </div>
</template>

<style scoped>
.navmenu-root { position: fixed; z-index: 1100; }
</style>

