import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyRedTheme } from './utils/applyRedTheme'
import App from './App.jsx'

applyRedTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
