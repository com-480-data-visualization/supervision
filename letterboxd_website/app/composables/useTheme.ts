import { ref, watch } from 'vue'

type Theme = 'light' | 'dark'

const theme = ref<Theme>('light')
let initialized = false

function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light'
  const fromAttr = document.documentElement.dataset.theme
  if (fromAttr === 'light' || fromAttr === 'dark') return fromAttr
  return 'light'
}

export function useTheme() {
  if (!initialized && typeof document !== 'undefined') {
    theme.value = readInitialTheme()
    watch(theme, (next) => {
      document.documentElement.dataset.theme = next
      try { localStorage.setItem('theme', next) } catch {}
    })
    initialized = true
  }

  function toggle() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function setTheme(next: Theme) {
    theme.value = next
  }

  return { theme, toggle, setTheme }
}
