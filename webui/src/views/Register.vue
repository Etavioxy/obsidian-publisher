<script setup lang="ts">
import AuthForm from '../components/AuthForm.vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const onSubmit = async (payload: { username: string; password: string }) => {
  await auth.register(payload)
  await auth.login(payload) // auto-login after register for simplicity
  await auth.fetchMe()
  router.push('/dashboard')
}
</script>

<template>
  <div class="view-register">
    <AuthForm title="Register" submitLabel="Create Account" :onSubmit="onSubmit" :loading="auth.loading" :error="auth.error" />
    <p style="margin-top:12px"><router-link to="/login">Already have an account? Login</router-link></p>
  </div>
</template>

<style scoped>
.view-register { padding: var(--vp-layout-padding); display: grid; place-items: center; }
</style>
