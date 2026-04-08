import { NavLink } from 'react-router-dom'

const navItems = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/goals', label: 'Goals', icon: '◎' },
  { href: '/routine', label: 'Routine', icon: '◷' },
  { href: '/finance', label: 'Finance', icon: '€' },
  { href: '/health', label: 'Health', icon: '♡' },
] as const

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary mobile navigation">
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/'}
          className={({ isActive }) => isActive ? 'bottom-nav__item active' : 'bottom-nav__item'}
        >
          <span className="bottom-nav__icon" aria-hidden="true">{item.icon}</span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
