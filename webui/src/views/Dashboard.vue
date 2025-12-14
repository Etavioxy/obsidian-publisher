<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { userApi } from '../api'
import Avatar from '../components/Avatar.vue'
import TextCard from '../components/TextCard.vue'
import ListDisplay from '../components/ListDisplay.vue'
import type { UserStatsResponse } from '../api/types'

const auth = useAuthStore()
const stats = ref<UserStatsResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

onMounted(async () => {
  if (!auth.token) return
  loading.value = true
  error.value = null
  try {
    stats.value = await userApi.getStats(auth.token)
  } catch (e: any) {
    error.value = e.message ?? 'Failed to load user data'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="view-dashboard">
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="stats" class="content">
      <div class="header">
        <Avatar :name="stats.username" size="large" />
        <div class="info">
          <h1>{{ stats.username }}</h1>
          <p>Account created: {{ new Date(stats.account_created).toLocaleDateString() }}</p>
        </div>
      </div>

      <TextCard title="Statistics" subtitle="Your account overview">
        <p><strong>User ID:</strong> {{ stats.user_id }}</p>
        <p><strong>Total Sites:</strong> {{ stats.total_sites }}</p>
      </TextCard>

      <TextCard title="Sites" :subtitle="`${stats.sites.length} site(s)`">
        <ListDisplay :items="stats.sites" empty-text="No sites yet">
          <template #default="{ items }">
            <div v-for="site in items" :key="site.id" class="site-item">
              <div class="site-info">
                <strong>{{ site.name ?? 'Unnamed Site' }}</strong>
                <span class="site-date">{{ new Date(site.created_at).toLocaleDateString() }}</span>
              </div>
              <a :href="`/sites/${site.id}/`" class="site-id" target="_blank">{{ site.id }}</a>
            </div>
          </template>
        </ListDisplay>
      </TextCard>

      <nav class="nav">
        <router-link to="/">Home</router-link>
        <router-link to="/about">About</router-link>
        <button @click="auth.logout(); $router.push('/login')">Logout</button>
      </nav>
    </div>
    <div v-else class="empty">
      <p>No user data available. Please <router-link to="/login">login</router-link>.</p>
    </div>
  </div>
</template>

<style scoped>
.view-dashboard {
  padding: var(--vp-layout-padding);
  max-width: var(--vp-layout-max-width);
  margin: 0 auto;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 40px;
  color: var(--vp-c-text-2);
}

.error {
  color: var(--vp-c-danger-2);
}

.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-border);
}

.info h1 {
  margin: 0;
  font-size: 24px;
  color: var(--vp-c-text-1);
}

.info p {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.site-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.site-item:last-child {
  border-bottom: none;
}

.site-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.site-date {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.site-id {
  font-size: 12px;
  color: var(--vp-c-brand-2);
  font-family: monospace;
  text-decoration: none;
  transition: opacity 0.3s;
}

.site-id:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.nav {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--vp-c-border);
}

.nav a,
.nav button {
  padding: 8px 16px;
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: border-color 0.3s;
}

.nav a:hover,
.nav button:hover {
  border-color: var(--vp-c-brand-2);
}

@media (min-width: 640px) {
  .info h1 {
    font-size: 32px;
  }
}
</style>
