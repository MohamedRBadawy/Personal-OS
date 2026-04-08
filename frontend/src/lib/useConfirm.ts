import { createContext, useCallback, useContext, useState } from 'react'

type ConfirmState = {
  open: boolean
  title: string
  message: string
  resolve: ((value: boolean) => void) | null
}

type ConfirmContextValue = {
  state: ConfirmState
  confirm: (title: string, message: string) => Promise<boolean>
  respond: (value: boolean) => void
}

const initialState: ConfirmState = {
  open: false,
  title: '',
  message: '',
  resolve: null,
}

export const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirmState() {
  const [state, setState] = useState<ConfirmState>(initialState)

  const confirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, title, message, resolve })
    })
  }, [])

  const respond = useCallback((value: boolean) => {
    setState((current) => {
      current.resolve?.(value)
      return initialState
    })
  }, [])

  return { state, confirm, respond }
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm must be used within a ConfirmProvider')
  return context.confirm
}
