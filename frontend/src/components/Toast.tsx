import { type ToastItem } from '../lib/useToast'

type ToastContainerProps = {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.variant}`} role="status">
          <span className="toast-icon">
            {toast.variant === 'success' ? '\u2713' : toast.variant === 'error' ? '\u2717' : '\u2139'}
          </span>
          <p className="toast-message">{toast.message}</p>
          <button className="toast-dismiss" type="button" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
