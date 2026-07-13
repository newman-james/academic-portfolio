import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import AboutPage from './pages/AboutPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ReadingPage from './pages/ReadingPage.jsx'
import WritingPage from './pages/WritingPage.jsx'

function App() {
  const location = useLocation()
  const isWritingPrintRoute = /^\/writing\/[^/]+\/print\/?$/.test(location.pathname)

  if (isWritingPrintRoute) {
    return (
      <Routes>
        <Route path="/writing/:slug/print" element={<WritingPage printMode />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    )
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<WritingPage />} />
        <Route path="/writing" element={<WritingPage />} />
        <Route path="/writing/:slug" element={<WritingPage />} />
        <Route path="/writing/:slug/print" element={<WritingPage printMode />} />
        <Route path="/reading" element={<ReadingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/home" element={<Navigate to="/writing" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}

export default App
