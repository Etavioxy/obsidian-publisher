/**
 * Hash-based Router with guards
 * Supports: #/login, #/register, #/me, #/admin
 */

import { authStore } from './state/auth';

export type RouteName = 'login' | 'register' | 'me' | 'admin' | '404';

export interface Route {
  path: string;
  name: RouteName;
  guard?: () => boolean | Promise<boolean>;
  redirect?: RouteName;
}

class Router {
  private routes: Map<RouteName, Route> = new Map();
  private currentRoute: RouteName = 'login';
  private listeners: Set<(route: RouteName) => void> = new Set();

  constructor() {
    this.initializeRoutes();
    this.setupHashChangeListener();
  }

  /**
   * Initialize all routes with their guards
   */
  private initializeRoutes(): void {
    this.routes.set('login', {
      path: '#/login',
      name: 'login',
      guard: () => {
        // If already authenticated, redirect to /me
        if (authStore.isAuthed()) {
          return false; // Prevent access
        }
        return true;
      },
      redirect: 'me',
    });

    this.routes.set('register', {
      path: '#/register',
      name: 'register',
      guard: () => {
        // If already authenticated, redirect to /me
        if (authStore.isAuthed()) {
          return false;
        }
        return true;
      },
      redirect: 'me',
    });

    this.routes.set('me', {
      path: '#/me',
      name: 'me',
      guard: () => {
        // Must be authenticated
        if (!authStore.isAuthed()) {
          return false;
        }
        return true;
      },
      redirect: 'login',
    });

    this.routes.set('admin', {
      path: '#/admin',
      name: 'admin',
      guard: () => {
        // Must be authenticated and admin
        if (!authStore.isAuthed() || !authStore.isAdmin()) {
          return false;
        }
        return true;
      },
      redirect: 'me',
    });

    this.routes.set('404', {
      path: '#/404',
      name: '404',
    });
  }

  /**
   * Setup hash change listener
   */
  private setupHashChangeListener(): void {
    if (typeof window === 'undefined') return;

    const handler = () => {
      this.handleHashChange();
    };

    window.addEventListener('hashchange', handler);
    // Initial route check
    this.handleHashChange();
  }

  /**
   * Handle hash change and validate route
   */
  private handleHashChange(): void {
    const hash = window.location.hash.slice(1) || '/me'; // Default to /me
    const routeName = this.getRouteNameFromPath(hash);
    this.navigateToRoute(routeName);
  }

  /**
   * Extract route name from path
   */
  private getRouteNameFromPath(path: string): RouteName {
    path = path.startsWith('/') ? path.slice(1) : path;
    
    if (path === 'login' || path === '') return 'login';
    if (path === 'register') return 'register';
    if (path === 'me') return 'me';
    if (path === 'admin') return 'admin';
    
    return '404';
  }

  /**
   * Navigate to a route with guard validation
   */
  async navigateToRoute(routeName: RouteName): Promise<void> {
    const route = this.routes.get(routeName);
    if (!route) {
      this.currentRoute = '404';
      this.notifyListeners('404');
      return;
    }

    // Check guard
    if (route.guard) {
      const allowed = await route.guard();
      if (!allowed) {
        // Redirect if guard failed
        const redirectTo = route.redirect || 'login';
        this.navigate(redirectTo);
        return;
      }
    }

    this.currentRoute = routeName;
    this.notifyListeners(routeName);
  }

  /**
   * Public navigate method
   */
  navigate(routeName: RouteName): void {
    window.location.hash = this.routes.get(routeName)?.path || '#/404';
  }

  /**
   * Get current route
   */
  getCurrentRoute(): RouteName {
    return this.currentRoute;
  }

  /**
   * Subscribe to route changes
   */
  subscribe(listener: (route: RouteName) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of route change
   */
  private notifyListeners(route: RouteName): void {
    this.listeners.forEach(listener => listener(route));
  }
}

export const router = new Router();
