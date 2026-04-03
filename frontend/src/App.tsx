import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './app/AppProviders'
import { AppRoutes } from './app/AppRoutes'
import { AppShell } from './app/AppShell'

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </BrowserRouter>
    </AppProviders>
  )
}

export default App
