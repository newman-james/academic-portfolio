import { Button } from '@carbon/react'
import { Link as RouterLink } from 'react-router-dom'

function EmptyState({ title, copy, actionText, actionTo }) {
  return (
    <div className="empty-state">
      <div className="empty-state__panel">
        <h2>{title}</h2>
        <p>{copy}</p>
        {actionText && actionTo ? (
          <div className="empty-state__actions">
            <Button as={RouterLink} kind="ghost" to={actionTo}>
              {actionText}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default EmptyState