import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Root from './Root.jsx'
import ThemeProvider from './theme/ThemeProvider.jsx'
import './styles/main.scss'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </StrictMode>,
)
