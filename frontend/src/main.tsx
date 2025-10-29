import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppKonva from './AppKonva.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppKonva />
    </ErrorBoundary>
  </StrictMode>,
)
