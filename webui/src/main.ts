import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import './style.css'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

// 初始化主题
const themeStore = useThemeStore()
themeStore.initTheme()

app.use(router)
app.mount('#app')
