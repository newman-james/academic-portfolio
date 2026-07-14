import { Download } from '@carbon/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Column, Grid } from '@carbon/react'
import { visibleWriting } from '../content/collections.js'
import { fetchVisibleReadingLog, getVisibleReadingSourceTypes, READING_LOG_DOWNLOAD_FILENAME, READING_LOG_DOWNLOAD_PATH } from '../content/readingLog.js'
import EmptyState from '../components/EmptyState.jsx'
import PageHeader from '../components/PageHeader.jsx'
import PageShell from '../components/PageShell.jsx'
import ReadingEntry from '../components/ReadingEntry.jsx'
import ReadingFilters from '../components/ReadingFilters.jsx'
import { siteDescription } from '../data/site.js'
import useDocumentMeta from '../hooks/useDocumentMeta.js'
import { getFilterOptions, matchesFilter, sortByCompletionDateDescending } from '../utils/content.js'

const ALL_SOURCE_TYPES_LABEL = 'All source types'

function ReadingPage() {
  useDocumentMeta('Reading', `Reading log, source notes and linked ideas. ${siteDescription}`)

  const [readingEntries, setReadingEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const sourceTypeOptions = useMemo(
    () => getFilterOptions(getVisibleReadingSourceTypes(readingEntries), ALL_SOURCE_TYPES_LABEL).map((item) => item.label),
    [readingEntries],
  )
  const [selectedSourceType, setSelectedSourceType] = useState(ALL_SOURCE_TYPES_LABEL)

  useEffect(() => {
    let isActive = true

    fetchVisibleReadingLog()
      .then((entries) => {
        if (!isActive) {
          return
        }

        setReadingEntries(entries)
        setLoadError('')
        setIsLoading(false)
      })
      .catch(() => {
        if (!isActive) {
          return
        }

        setReadingEntries([])
        setLoadError('The reading log could not be loaded from the CSV file.')
        setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const filteredReading = useMemo(() => {
    return sortByCompletionDateDescending(readingEntries).filter((entry) => {
      const matchesSourceType = matchesFilter(entry.sourceType, selectedSourceType, ALL_SOURCE_TYPES_LABEL)

      return matchesSourceType
    })
  }, [readingEntries, selectedSourceType])

  return (
    <PageShell>
      <PageHeader
        eyebrow="Reading"
        title="Reading log and source notes"
        intro="A structured record of books, essays, articles and reports that inform the writing collected elsewhere in the portfolio."
        actions={(
          <Button as="a" href={READING_LOG_DOWNLOAD_PATH} download={READING_LOG_DOWNLOAD_FILENAME} kind="tertiary" renderIcon={Download}>
            Download CSV
          </Button>
        )}
      />
      <ReadingFilters
        onSourceTypeChange={setSelectedSourceType}
        resultCount={filteredReading.length}
        selectedSourceType={selectedSourceType}
        sourceTypes={sourceTypeOptions}
      />

      <section className="page-section">
        <Grid className="reading-page__results-grid">
          <Column sm={4} md={8} lg={12}>
            {isLoading ? (
              <EmptyState
                title="Loading reading log"
                copy="Reading entries are being loaded from the local CSV file."
              />
            ) : loadError ? (
              <EmptyState title="Reading log unavailable" copy={loadError} />
            ) : filteredReading.length ? (
              <div className="reading-list">
                {filteredReading.map((entry) => {
                  const relatedPieces = visibleWriting.filter((piece) => entry.relatedWriting.includes(piece.id))

                  return <ReadingEntry key={entry.id} entry={entry} relatedPieces={relatedPieces} />
                })}
              </div>
            ) : (
              <EmptyState
                title="No reading entries match the current filters"
                copy="Try widening the source type filter to see more reading notes."
              />
            )}
          </Column>
        </Grid>
      </section>
    </PageShell>
  )
}

export default ReadingPage