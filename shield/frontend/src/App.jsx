import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-main)',
          },
        }}
      />
    </BrowserRouter>
  )
}

export default App
