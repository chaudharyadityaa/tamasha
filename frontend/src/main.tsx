import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { startWarmUp } from './api/warmUp'
import App from './App.tsx'

// Wake the server (and its database) as early as possible, in parallel with loading the page.
void startWarmUp()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)