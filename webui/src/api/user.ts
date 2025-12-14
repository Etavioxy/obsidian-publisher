// User API types and functions
import type { UpdateUserRequest, UserProfileResponse, UserResponse, UserStatsResponse } from './types'

// User endpoints
const API_BASE = import.meta.env.VITE_API_BASE || ''

export const userApi = {
  /**
   * 获取用户详细信息（包括站点列表）
   */
  async getProfile(token: string): Promise<UserProfileResponse> {
    const response = await fetch(`${API_BASE}/user/profile`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Get profile failed: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * 更新用户信息
   */
  async updateProfile(token: string, data: UpdateUserRequest): Promise<UserResponse> {
    const response = await fetch(`${API_BASE}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Update profile failed: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * 获取用户统计信息
   */
  async getStats(token: string): Promise<UserStatsResponse> {
    const response = await fetch(`${API_BASE}/user/stats`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Get stats failed: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * 删除用户账户
   */
  async deleteAccount(token: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/user/account`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Delete account failed: ${response.statusText}`)
    }

    return response.json()
  },
}
