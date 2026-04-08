import type { PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ToastContainer } from '../components/Toast'
import { ConfirmContext, useConfirmState } from '../lib/useConfirm'
import { ToastContext, useToastState } from '../lib/useToast'
import { appQueryClient } from '../lib/queryClient'

function InfraProviders({ children }: PropsWithChildren) {
  const toastState = useToastState()
  const confirmState = useConfirmState()

  return (
    <ToastContext.Provider value={toastState}>
      <ConfirmContext.Provider value={confirmState}>
        {children}
        <ToastContainer toasts={toastState.toasts} onDismiss={toastState.dismiss} />
        <ConfirmDialog
          open={confirmState.state.open}
          title={confirmState.state.title}
          message={confirmState.state.message}
          onConfirm={() => confirmState.respond(true)}
          onCancel={() => confirmState.respond(false)}
        />
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  )
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={appQueryClient}>
      <InfraProviders>{children}</InfraProviders>
    </QueryClientProvider>
  )
}
