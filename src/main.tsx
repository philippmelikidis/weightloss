import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { registerSW } from 'virtual:pwa-register'

// Register service worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Neue Version verfügbar. Jetzt aktualisieren?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App ist offline bereit!')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
