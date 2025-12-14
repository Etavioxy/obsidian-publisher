import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeType = 'light' | 'dark' | 'auto'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeType>('auto')
  const isDark = ref(false)

  // 检测系统深色模式
  const detectSystemDarkMode = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  }

  // 应用主题
  const applyTheme = () => {
    let isDarkMode = false

    if (theme.value === 'auto') {
      isDarkMode = detectSystemDarkMode()
    } else {
      isDarkMode = theme.value === 'dark'
    }

    isDark.value = isDarkMode

    if (typeof document !== 'undefined') {
      const html = document.documentElement
      if (isDarkMode) {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }
  }

  // 设置主题
  const setTheme = (newTheme: ThemeType) => {
    theme.value = newTheme
    applyTheme()
    localStorage.setItem('theme', newTheme)
  }

  // 初始化主题
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') as ThemeType | null
    if (savedTheme) {
      theme.value = savedTheme
    }
    applyTheme()

    // 监听系统深色模式变化
    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (theme.value === 'auto') {
          applyTheme()
        }
      })
    }
  }

  watch(theme, applyTheme)

  return {
    theme,
    isDark,
    setTheme,
    initTheme,
  }
})
