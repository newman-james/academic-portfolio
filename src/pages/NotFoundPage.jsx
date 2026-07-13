import { Link } from '@carbon/react'
import { Link as RouterLink } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import useDocumentMeta from '../hooks/useDocumentMeta.js'

function NotFoundPage() {
  useDocumentMeta('Page not found', 'The requested page could not be found.')

  return (
    <EmptyState
      title="Page not found"
      copy={
        <>
          The route you requested is not available. Return to the{' '}
          <Link as={RouterLink} to="/">
            home page
          </Link>
          .
        </>
      }
    />
  )
}

export default NotFoundPage