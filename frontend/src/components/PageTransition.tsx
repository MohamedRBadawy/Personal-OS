import { type PropsWithChildren, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function PageTransition({ children }: PropsWithChildren) {
  const location = useLocation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.classList.remove('page-fade-in')
    // Force reflow so the animation restarts on each navigation
    void el.offsetHeight
    el.classList.add('page-fade-in')
  }, [location.pathname])

  return (
    <div ref={ref} className="page-fade-in">
      {children}
    </div>
  )
}
