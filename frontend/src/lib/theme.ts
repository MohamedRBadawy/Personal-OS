// [AR] أدوات السمة — قراءة التفضيل المخزن وتطبيق السمة الفعلية على عنصر html
// [EN] Theme utilities — read the stored preference and apply the effective theme to html
export type ThemePreference = 'dark' | 'light' | 'system'
export type EffectiveTheme = 'dark' | 'light'

const STORAGE_KEY = 'theme'

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system'
}

export function getStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isThemePreference(stored)) {
      return stored
    }
  } catch {
    // Ignore unavailable storage and fall back to system.
  }

  return 'system'
}

export function getEffectiveTheme(theme: ThemePreference = getStoredTheme()): EffectiveTheme {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return theme
}

export function setTheme(theme: ThemePreference): void {
  const effectiveTheme = getEffectiveTheme(theme)
  document.documentElement.setAttribute('data-theme', effectiveTheme)

  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Ignore unavailable storage to keep theme switching functional.
  }
}
