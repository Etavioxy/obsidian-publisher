<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { userApi } from '../api'

const authStore = useAuthStore()

const siteCount = ref<number | null>(null)
const loading = ref(false)

const isLoggedIn = computed(() => !!authStore.token && !!authStore.user)
const title = 'Observer'
const userCount = computed(() => (isLoggedIn.value ? 1 : 0))

const fetchStats = async () => {
  if (!authStore.token) return
  loading.value = true
  try {
    const stats = await userApi.getStats(authStore.token)
    siteCount.value = stats?.total_sites ?? stats?.sites?.length ?? 0
  } catch (err) {
    console.error('Failed to load stats', err)
    siteCount.value = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (isLoggedIn.value) fetchStats()
})
</script>

<template>
  <div class="root">
    <div class="panel panel-main">
      <h1 class="title">{{ title }}</h1>
    </div>
    <div class="grid">
        <div class="panel panel-stats">
                    <div class="stat-label">Users</div>
                    <div class="stat-value">{{ loading ? '...' : userCount }}</div>
        </div>
        <div class="panel panel-stats">
                    <div class="stat-label">Sites</div>
                    <div class="stat-value">{{ loading ? '...' : (siteCount ?? '—') }}</div>
        </div>
    </div>
  </div>
</template>

