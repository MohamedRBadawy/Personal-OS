// [AR] خطاف السمة — يُزامن تفضيل السمة المخزن مع حالة React ويتابع تغييرات إعدادات النظام
// [EN] Theme hook — syncs stored theme preference with React state and tracks system preference changes
import { useCallback, useEffect, useState } from 'react'
import { getEffectiveTheme, getStoredTheme, setTheme, type EffectiveTheme, type ThemePreference } from './theme'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>(() => getStoredTheme())
  const [effectiveTheme, setEffectiveThemeState] = useState<EffectiveTheme>(() => getEffectiveTheme(getStoredTheme()))

  useEffect(() => {
    const resolvedTheme = getEffectiveTheme(theme)
    setEffectiveThemeState(resolvedTheme)
    setTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const resolvedTheme = getEffectiveTheme('system')
      setEffectiveThemeState(resolvedTheme)
      setTheme('system')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const updateTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const currentEffectiveTheme = getEffectiveTheme(current)
      return currentEffectiveTheme === 'dark' ? 'light' : 'dark'
    })
  }, [])

  return { theme, effectiveTheme, setTheme: updateTheme, toggleTheme }
}
