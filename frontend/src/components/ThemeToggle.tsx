// [AR] زر تبديل السمة — يبدّل بين الداكن والفاتح ويزامن التفضيل مع ملف المستخدم بدون حظر الواجهة
// [EN] Theme toggle button — switches dark/light and fire-and-forget syncs the preference to profile
import { startTransition } from 'react'
import { updateProfile } from '../lib/api'
import { useTheme } from '../lib/useTheme'

export function ThemeToggle() {
  const { effectiveTheme, setTheme } = useTheme()

  function handleToggle() {
    const nextTheme = effectiveTheme === 'dark' ? 'light' : 'dark'

    startTransition(() => {
      setTheme(nextTheme)
    })

    void updateProfile({ theme_preference: nextTheme }).catch(() => {
      // Silent failure keeps the toggle responsive even if the API is unavailable.
    })
  }

  const isDark = effectiveTheme === 'dark'

  return (
    <button
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="theme-toggle"
      type="button"
      onClick={handleToggle}
    >
      <span aria-hidden="true" className="theme-toggle__icon">
        {isDark ? '☀' : '☾'}
      </span>
      <span className="theme-toggle__label">
        {isDark ? 'Light mode' : 'Dark mode'}
      </span>
    </button>
  )
}
