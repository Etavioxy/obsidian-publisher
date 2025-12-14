// Shared API types

// Auth
export interface RegisterRequest {
  username: string
  password: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface UserResponse {
  id: string
  username: string
  created_at: string
}

export interface LoginResponse {
  token: string
  user: UserResponse
}

// Site
export interface SiteResponse {
  id: string
  name: string
  domain: string | null
  description: string
  created_at: string
  url: string
  url_by_id: string
}

// User
export interface UserProfileResponse {
  user: UserResponse
  sites: SiteResponse[]
  total_sites: number
}

export interface UpdateUserRequest {
  username?: string
}

export interface UserStatsResponse {
  user_id: string
  username: string
  total_sites: number
  account_created: string
  sites: SiteResponse[]
}
