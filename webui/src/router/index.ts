import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import About from '../views/About.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import { ENABLE_DEMO, isDemoPath as _isDemoPath, maybeRegisterDemoRoutes } from '../demo.config'

export const demoPaths = ENABLE_DEMO ? ['/radial-demo'] : []
export const isDemoPath = (path: string) => _isDemoPath(path)

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { showNav: true },
  },
  {
    path: '/about',
    name: 'About',
    component: About,
    meta: { showNav: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { showNav: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { showNav: false },
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { showNav: false },
  },
]

// Centralized demo route registration
maybeRegisterDemoRoutes(routes)

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
