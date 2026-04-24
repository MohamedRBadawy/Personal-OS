import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './app/AppProviders'
import { AppRoutes } from './app/AppRoutes'
import { AppShell } from './app/AppShell'
import { BackendWakeGate } from './components/BackendWakeGate'

function App() {
  return (
    <AppProviders>
      <BackendWakeGate>
        <BrowserRouter>
          <AppShell>
            <AppRoutes />
          </AppShell>
        </BrowserRouter>
      </BackendWakeGate>
    </AppProviders>
  )
}

export default App
