/**
 * Main Application Entry Point
 */

import { router, RouteName } from './router';
import { authStore } from './state/auth';
import { createLoginView } from './views/login';
import { createRegisterView } from './views/register';
import { createMeView } from './views/me';
import { createAdminView } from './views/admin';
import { create404View } from './views/404';
import 'uno.css';

class App {
  private appContainer: HTMLElement | null = null;

  constructor() {
    this.initializeApp();
  }

  /**
   * Initialize app - setup DOM and event listeners
   */
  private initializeApp(): void {
    if (typeof window === 'undefined') return;

    this.appContainer = document.getElementById('app');
    if (!this.appContainer) {
      console.error('App container not found');
      return;
    }

    // Subscribe to auth changes to update UI
    authStore.subscribe(() => {
      const currentRoute = router.getCurrentRoute();
      this.render(currentRoute);
    });

    // Subscribe to route changes
    router.subscribe((route) => {
      this.render(route);
    });

    // Initial render
    const initialRoute = router.getCurrentRoute();
    this.render(initialRoute);
  }

  /**
   * Render view based on current route
   */
  private render(route: RouteName): void {
    if (!this.appContainer) return;

    // Clear current view
    this.appContainer.innerHTML = '';

    // Render appropriate view
    let view: HTMLElement;
    switch (route) {
      case 'login':
        view = createLoginView();
        break;
      case 'register':
        view = createRegisterView();
        break;
      case 'me':
        view = createMeView();
        break;
      case 'admin':
        view = createAdminView();
        break;
      case '404':
      default:
        view = create404View();
        break;
    }

    this.appContainer.appendChild(view);
  }
}

// Initialize app when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new App();
    });
  } else {
    new App();
  }
}
