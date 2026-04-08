import type { PropsWithChildren, ReactElement } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ToastContainer } from '../components/Toast'
import { AppShell } from '../app/AppShell'
import { AppRoutes } from '../app/AppRoutes'
import { ConfirmContext, useConfirmState } from '../lib/useConfirm'
import { ToastContext, useToastState } from '../lib/useToast'
import { createAppQueryClient } from '../lib/queryClient'

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

export function renderRoute(route: string) {
  const queryClient = createAppQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <InfraProviders>
        <MemoryRouter initialEntries={[route]}>
          <AppShell>
            <AppRoutes />
          </AppShell>
        </MemoryRouter>
      </InfraProviders>
    </QueryClientProvider>,
  )
}

export function renderWithProviders(ui: ReactElement, route = '/') {
  const queryClient = createAppQueryClient()

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <InfraProviders>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </InfraProviders>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper })
}
