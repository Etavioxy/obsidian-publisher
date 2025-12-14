import { describe, it, expect, beforeAll } from 'vitest'
import * as api from '../src/api'

describe('API Integration Tests', () => {
  let authToken: string
  let userId: string
  const testUsername = `test_user_${Date.now()}`
  const testPassword = 'test_password_123'

  describe('Auth API', () => {
    it('should register a new user', async () => {
      const result = await api.authApi.register({
        username: testUsername,
        password: testPassword,
      })

      expect(result).toBeDefined()
      expect(result.username).toBe(testUsername)
      expect(result.id).toBeDefined()
      expect(result.created_at).toBeDefined()
      
      userId = result.id
    })

    it('should login with correct credentials', async () => {
      const result = await api.authApi.login({
        username: testUsername,
        password: testPassword,
      })

      expect(result).toBeDefined()
      expect(result.token).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.user.username).toBe(testUsername)
      expect(result.user.id).toBe(userId)
      
      authToken = result.token
    })

    it('should get current user info with token', async () => {
      const result = await api.authApi.me(authToken)

      expect(result).toBeDefined()
      expect(result.username).toBe(testUsername)
      expect(result.id).toBe(userId)
    })

    it('should fail to get user info without token', async () => {
      await expect(api.authApi.me('')).rejects.toThrow()
    })
  })

  describe('User API', () => {
    beforeAll(() => {
      if (!authToken) {
        throw new Error('Auth token not set. Run auth tests first.')
      }
    })

    it('should get user profile', async () => {
      const result = await api.userApi.getProfile(authToken)

      expect(result).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.user.username).toBe(testUsername)
      expect(result.sites).toBeDefined()
      expect(Array.isArray(result.sites)).toBe(true)
      expect(result.total_sites).toBe(0) // 新用户没有站点
    })

    it('should get user stats', async () => {
      const result = await api.userApi.getStats(authToken)

      expect(result).toBeDefined()
      expect(result.username).toBe(testUsername)
      expect(result.user_id).toBe(userId)
      expect(result.total_sites).toBe(0)
      expect(result.sites).toBeDefined()
      expect(Array.isArray(result.sites)).toBe(true)
      expect(result.account_created).toBeDefined()
    })

    it('should update user profile', async () => {
      const newUsername = `${testUsername}_updated`
      
      const result = await api.userApi.updateProfile(authToken, {
        username: newUsername,
      })

      expect(result).toBeDefined()
      expect(result.username).toBe(newUsername)
      expect(result.id).toBe(userId)
    })

    it('should delete user account', async () => {
      const result = await api.userApi.deleteAccount(authToken)

      expect(result).toBeDefined()
      expect(result.message).toBeDefined()
      expect(result.message).toContain('deleted')
    })

    it('should fail to access deleted user account', async () => {
      await expect(api.userApi.getProfile(authToken)).rejects.toThrow()
    })
  })
})
