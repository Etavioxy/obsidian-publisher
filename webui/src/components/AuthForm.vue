<script setup lang="ts">
const props = defineProps<{
  title: string
  submitLabel: string
  onSubmit: (payload: { username: string; password: string }) => Promise<void>
  loading?: boolean
  error?: string | null
}>()

let username = ''
let password = ''

const handleSubmit = async (e: Event) => {
  e.preventDefault()
  await props.onSubmit({ username, password })
}
</script>

<template>
  <form class="auth-form" @submit="handleSubmit">
    <h1>{{ title }}</h1>
    <div class="field">
      <label>Username</label>
      <input v-model="username" type="text" required placeholder="Enter username" />
    </div>
    <div class="field">
      <label>Password</label>
      <input v-model="password" type="password" required placeholder="Enter password" />
    </div>
    <button class="submit" type="submit" :disabled="loading">{{ submitLabel }}</button>
    <p v-if="error" class="error">{{ error }}</p>
  </form>
</template>

<style scoped>
.auth-form {
  display: grid;
  gap: 12px;
  padding: var(--vp-layout-padding);
  max-width: 420px;
}
.field label { font-weight: 600; display: block; margin-bottom: 6px; }
.field input { width: 100%; padding: 10px; border: 1px solid var(--vp-c-border); border-radius: 8px; background: var(--vp-c-bg-elv); color: var(--vp-c-text-1); }
.submit { padding: 10px 14px; border-radius: 8px; border: 1px solid var(--vp-c-border); background: var(--vp-c-brand-2); color: white; }
.error { color: var(--vp-c-danger-2); }

@media (min-width: 640px) { .auth-form { max-width: 520px; } }
</style>
