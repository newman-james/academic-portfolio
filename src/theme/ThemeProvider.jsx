import { useEffect, useState } from 'react'
import ThemeContext from './ThemeContext.js'

const STORAGE_KEY = 'academic-portfolio-theme'

function getPreferredTheme() {
  if (typeof window === 'undefined') {
    return 'g100'
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY)

  if (storedTheme === 'g10' || storedTheme === 'g100') {
    return storedTheme
  }

  return 'g100'
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getPreferredTheme)
  const [hasExplicitPreference, setHasExplicitPreference] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return Boolean(window.localStorage.getItem(STORAGE_KEY))
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-carbon-theme', theme)
  }, [theme])

  useEffect(() => {
    if (hasExplicitPreference) {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (event) => {
      setTheme(event.matches ? 'g100' : 'g10')
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [hasExplicitPreference])

  const toggleTheme = () => {
    const nextTheme = theme === 'g100' ? 'g10' : 'g100'

    window.localStorage.setItem(STORAGE_KEY, nextTheme)
    setTheme(nextTheme)
    setHasExplicitPreference(true)
  }

  const value = {
    isDark: theme === 'g100',
    theme,
    toggleTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeProvider