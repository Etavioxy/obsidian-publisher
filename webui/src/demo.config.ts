// Centralized demo configuration and helpers
// Controls whether demo routes/components are enabled and provides utilities

export const ENABLE_DEMO: boolean = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true'

export const DEMO_PATHS: string[] = ['/radial-demo']

export const isDemoPath = (path: string): boolean => {
  return ENABLE_DEMO && DEMO_PATHS.some((p) => path.startsWith(p))
}

export const shouldShowDemoNav = (): boolean => ENABLE_DEMO

// Helper to conditionally register demo route (using dynamic import)
export const maybeRegisterDemoRoutes = <T extends { path: string }>(routes: Array<T & any>) => {
  if (!ENABLE_DEMO) return
  routes.push({
    path: '/radial-demo',
    name: 'RadialDemo',
    component: () => import('./views/RadialDemo.vue'),
    meta: { showNav: true },
  })
}
