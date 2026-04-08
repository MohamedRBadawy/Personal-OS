import { createContext, useCallback, useContext, useState } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export type ToastItem = {
  id: number
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  toasts: ToastItem[]
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToastState() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = nextId++
    setToasts((current) => [...current, { id, message, variant }])
    const timeout = variant === 'error' ? 8000 : 4000
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, timeout)
  }, [])

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast])
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast])
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast])
  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  return { toasts, success, error, info, dismiss }
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
