// [AR] شريط التنقل السفلي للجوال — ألوان المحاور بدلاً من الأيقونات
// [EN] Mobile bottom nav — hub colors as identity markers instead of icons
import { NavLink } from 'react-router-dom'

const navItems = [
  { href: '/',        label: 'Home',    color: 'var(--color-hub-now)' },
  { href: '/goals',   label: 'Goals',   color: 'var(--color-hub-goals)' },
  { href: '/routine', label: 'Routine', color: 'var(--color-hub-build)' },
  { href: '/finance', label: 'Finance', color: 'var(--color-hub-life)' },
  { href: '/health',  label: 'Health',  color: 'var(--color-hub-profile)' },
] as const

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary mobile navigation">
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/'}
          style={{ '--hub-color': item.color } as React.CSSProperties}
          className={({ isActive }) => isActive ? 'bottom-nav__item active' : 'bottom-nav__item'}
        >
          <span className="bottom-nav__dot" aria-hidden="true" />
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
