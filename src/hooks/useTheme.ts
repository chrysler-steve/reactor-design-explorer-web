import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'reactor-design-explorer-theme'

function getInitialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/** Reads the theme the inline bootstrap script (index.html) already applied
 * to <html> before hydration — avoiding a flash of the wrong theme — and
 * keeps it in sync with toggles + storage from then on. Defaults to dark. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  return {
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  }
}
