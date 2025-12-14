// Auth API types and functions
import type { LoginRequest, LoginResponse, RegisterRequest, UserResponse } from './types'

// Auth endpoints
const API_BASE = import.meta.env.VITE_API_BASE || ''

export const authApi = {
  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<UserResponse> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Register failed: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * 获取当前用户信息（需要token）
   */
  async me(token: string): Promise<UserResponse> {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Get user failed: ${response.statusText}`)
    }

    return response.json()
  },
}
