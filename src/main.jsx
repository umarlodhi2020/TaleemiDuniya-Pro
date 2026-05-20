import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initOfflineSync } from './services/offline'

// Initialize offline sync service
initOfflineSync()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* 🔥 LIVE WEB APP KE LIYE PWA SERVICE WORKER WAPAS ENABLE KAR DIYA HAI */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[TDM] Service Worker registered — scope:', reg.scope)
      })
      .catch((err) => {
        console.warn('[TDM] Service Worker registration failed:', err)
      })
  })
}
