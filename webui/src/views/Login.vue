<script setup lang="ts">
import AuthForm from '../components/AuthForm.vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const onSubmit = async (payload: { username: string; password: string }) => {
  await auth.login(payload)
  await auth.fetchMe()
  router.push('/dashboard')
}
</script>

<template>
  <div class="view-login">
    <AuthForm title="Login" submitLabel="Login" :onSubmit="onSubmit" :loading="auth.loading" :error="auth.error" />
    <p style="margin-top:12px"><router-link to="/register">No account? Register</router-link></p>
  </div>
</template>

<style scoped>
.view-login { padding: var(--vp-layout-padding); display: grid; place-items: center; }
</style>
