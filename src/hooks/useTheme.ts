import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'reactor-design-explorer-theme'

function getInitialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

// Every useTheme() call site otherwise owns an independent useState instance
// — toggling in one place (e.g. ThemeToggle) wouldn't re-render another (e.g.
// the 3D scenes' useReactorPalette) until that component next unmounted and
// remounted. This shared subscriber list keeps every mounted instance in sync.
const listeners = new Set<(theme: Theme) => void>()

/** Reads the theme the inline bootstrap script (index.html) already applied
 * to <html> before hydration — avoiding a flash of the wrong theme — and
 * keeps it in sync with toggles + storage from then on. Defaults to dark. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    listeners.add(setTheme)
    return () => {
      listeners.delete(setTheme)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  return {
    theme,
    toggleTheme: () =>
      setTheme((t) => {
        const next: Theme = t === 'dark' ? 'light' : 'dark'
        listeners.forEach((listener) => listener(next))
        return next
      }),
  }
}
