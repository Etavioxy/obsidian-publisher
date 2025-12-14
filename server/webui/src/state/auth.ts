/**
 * Auth Store - Lightweight authentication state management
 * Uses localStorage for token persistence and in-memory state
 */

export interface User {
  id: string;
  username: string;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

class AuthStore {
  private token: string | null = null;
  private user: User | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.restoreFromStorage();
  }

  /**
   * Restore auth state from localStorage
   */
  private restoreFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem('auth_token');
    const userStored = localStorage.getItem('auth_user');
    
    if (stored && userStored) {
      try {
        this.token = stored;
        this.user = JSON.parse(userStored);
      } catch (e) {
        console.warn('Failed to restore auth state:', e);
        this.clear();
      }
    }
  }

  /**
   * Set user and token from login response
   */
  setAuth(response: LoginResponse): void {
    this.token = response.token;
    this.user = response.user;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
    }
    
    this.notifyListeners();
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get current user
   */
  getUser(): User | null {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthed(): boolean {
    return !!this.token && !!this.user;
  }

  /**
   * Check if user is admin (placeholder for future role system)
   */
  isAdmin(): boolean {
    // TODO: Add role field to User model in server
    // For now, check if username is 'admin'
    return this.user?.username === 'admin';
  }

  /**
   * Clear all auth state
   */
  clear(): void {
    this.token = null;
    this.user = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
    
    this.notifyListeners();
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

export const authStore = new AuthStore();
