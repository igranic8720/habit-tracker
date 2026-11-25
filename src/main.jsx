import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// global styles first, so component styles (imported by App) can build on them
import './styles/theme.css'
import './styles/base.css'
import './styles/buttons.css'
import './styles/forms.css'
import './styles/layout.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
