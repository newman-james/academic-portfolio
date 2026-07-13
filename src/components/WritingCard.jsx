import { ClickableTile, Tag } from '@carbon/react'
import { Link as RouterLink } from 'react-router-dom'
import { formatDate, formatReadingTime, getDisplaySummary } from '../utils/content.js'

function WritingCard({ piece }) {
  const summary = getDisplaySummary(piece)
  const showSubject = piece.subject && piece.subject !== 'Unassigned'
  const showType = piece.type && piece.type !== 'Unassigned'

  return (
    <ClickableTile as={RouterLink} className="writing-card" to={`/writing/${piece.slug}`}>
      <div className="writing-card__tag-row" aria-label="Writing tags">
        {showSubject ? <Tag type="cool-gray">{piece.subject}</Tag> : null}
        {showType ? <Tag type="cyan">{piece.type}</Tag> : null}
        {piece.status === 'review' ? <Tag type="purple">Review</Tag> : null}
        {piece.featured ? <Tag type="warm-red">Featured</Tag> : null}
      </div>
      {showType ? <p className="writing-card__meta">{piece.type}</p> : null}
      <h3>{piece.title}</h3>
      {piece.subtitle ? <p className="writing-card__subtitle">{piece.subtitle}</p> : null}
      <p className="writing-card__summary">{summary}</p>
      <div className="writing-card__details">
        <time dateTime={piece.date}>{formatDate(piece.date)}</time>
        <span>{formatReadingTime(piece.readingTime)}</span>
      </div>
      <p className="writing-card__cta">Read article</p>
    </ClickableTile>
  )
}

export default WritingCard