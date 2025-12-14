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

// User
export interface UserProfileResponse {
  user: UserResponse
  sites: any[] // TODO: replace with typed SiteResponse when site APIs are added
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
  sites: any[] // TODO: replace with typed SiteResponse when site APIs are added
}
