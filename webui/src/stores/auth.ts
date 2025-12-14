import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '../api'
import type { LoginRequest, RegisterRequest, UserResponse } from '../api/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<UserResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const setToken = (t: string | null) => {
    token.value = t
    if (t) localStorage.setItem('token', t)
    else localStorage.removeItem('token')
  }

  const logout = () => {
    setToken(null)
    user.value = null
  }

  const login = async (payload: LoginRequest) => {
    loading.value = true
    error.value = null
    try {
      const res = await authApi.login(payload)
      setToken(res.token)
      user.value = res.user
      return res
    } catch (e: any) {
      error.value = e.message ?? 'Login failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  const register = async (payload: RegisterRequest) => {
    loading.value = true
    error.value = null
    try {
      const res = await authApi.register(payload)
      user.value = res
      return res
    } catch (e: any) {
      error.value = e.message ?? 'Register failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchMe = async () => {
    if (!token.value) return null
    loading.value = true
    error.value = null
    try {
      const res = await authApi.me(token.value)
      user.value = res
      return res
    } catch (e: any) {
      error.value = e.message ?? 'Fetch me failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { token, user, loading, error, setToken, logout, login, register, fetchMe }
})
