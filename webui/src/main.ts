import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import DemoApp from './DemoApp.vue'
import router from './router'
import { ENABLE_DEMO, isDemoPath } from './demo.config'
import { useThemeStore } from './stores/theme'
import './style.css'

const isDemo = ENABLE_DEMO && isDemoPath(window.location.pathname)
const RootComponent = isDemo ? DemoApp : App

const app = createApp(RootComponent)

const pinia = createPinia()
app.use(pinia)

// 初始化主题
const themeStore = useThemeStore()
themeStore.initTheme()

app.use(router)
app.mount('#app')
