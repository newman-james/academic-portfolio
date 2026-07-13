import { Link, Tag, Tile } from '@carbon/react'
import { Link as RouterLink } from 'react-router-dom'
import { formatDate } from '../utils/content.js'

function ReadingEntry({ entry, relatedPieces }) {
  return (
    <Tile className="reading-entry">
      <header className="reading-entry__header">
        <div>
          <h2>{entry.title}</h2>
          <p className="reading-entry__author">
            {entry.author}{entry.publicationYear ? `, ${entry.publicationYear}` : ''}
          </p>
        </div>
        <div className="tag-row">
          <Tag type="cool-gray">{entry.sourceType}</Tag>
          <Tag type={entry.readingStatus === 'Completed' ? 'green' : 'purple'}>{entry.readingStatus}</Tag>
        </div>
      </header>

      <p>{entry.summary}</p>
      <blockquote>
        <p>{entry.keyIdea}</p>
      </blockquote>

      <dl className="reading-entry__metadata">
        <div>
          <dt>Completed</dt>
          <dd>{formatDate(entry.dateCompleted)}</dd>
        </div>
        <div>
          <dt>Document status</dt>
          <dd>{entry.status}</dd>
        </div>
      </dl>

      {relatedPieces.length ? (
        <section>
          <h3>Related writing</h3>
          <ul>
            {relatedPieces.map((piece) => (
              <li key={piece.id}>
                <Link as={RouterLink} to={`/writing/${piece.slug}`}>
                  {piece.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Tile>
  )
}

export default ReadingEntry