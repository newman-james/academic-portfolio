import { GlobalTheme } from '@carbon/react'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import useTheme from './theme/useTheme.js'

function Root() {
  const { theme } = useTheme()

  return (
    <GlobalTheme theme={theme}>
      <div className={`theme-root portfolio-theme cds--${theme}`} data-carbon-theme={theme}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      </div>
    </GlobalTheme>
  )
}

export default Root