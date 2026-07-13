import { Download } from '@carbon/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Column, Grid } from '@carbon/react'
import { visibleWriting } from '../content/collections.js'
import { fetchVisibleReadingLog, getVisibleReadingSourceTypes, getVisibleReadingStatuses, READING_LOG_DOWNLOAD_PATH } from '../content/readingLog.js'
import EmptyState from '../components/EmptyState.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ReadingEntry from '../components/ReadingEntry.jsx'
import ReadingFilters from '../components/ReadingFilters.jsx'
import { siteDescription } from '../data/site.js'
import useDocumentMeta from '../hooks/useDocumentMeta.js'
import { getFilterOptions, matchesFilter, sortByCompletionDateDescending } from '../utils/content.js'

const ALL_STATUSES_LABEL = 'All statuses'
const ALL_SOURCE_TYPES_LABEL = 'All source types'

function ReadingPage() {
  useDocumentMeta('Reading', `Reading log, source notes and linked ideas. ${siteDescription}`)

  const [readingEntries, setReadingEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const readingStatusOptions = useMemo(
    () => getFilterOptions(getVisibleReadingStatuses(readingEntries), ALL_STATUSES_LABEL).map((item) => item.label),
    [readingEntries],
  )
  const sourceTypeOptions = useMemo(
    () => getFilterOptions(getVisibleReadingSourceTypes(readingEntries), ALL_SOURCE_TYPES_LABEL).map((item) => item.label),
    [readingEntries],
  )
  const [selectedStatus, setSelectedStatus] = useState(ALL_STATUSES_LABEL)
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
      const matchesStatus = matchesFilter(entry.readingStatus, selectedStatus, ALL_STATUSES_LABEL)
      const matchesSourceType = matchesFilter(entry.sourceType, selectedSourceType, ALL_SOURCE_TYPES_LABEL)

      return matchesStatus && matchesSourceType
    })
  }, [readingEntries, selectedSourceType, selectedStatus])

  return (
    <>
      <PageHeader
        eyebrow="Reading"
        title="Reading log and source notes"
        intro="A structured record of books, essays, articles and reports that inform the writing collected elsewhere in the portfolio."
        actions={(
          <Button as="a" href={READING_LOG_DOWNLOAD_PATH} download="reading-log.csv" kind="tertiary" renderIcon={Download}>
            Download CSV
          </Button>
        )}
      />
      <ReadingFilters
        onSourceTypeChange={setSelectedSourceType}
        onStatusChange={setSelectedStatus}
        resultCount={filteredReading.length}
        selectedSourceType={selectedSourceType}
        selectedStatus={selectedStatus}
        sourceTypes={sourceTypeOptions}
        statuses={readingStatusOptions}
      />

      <section className="page-section">
        <Grid className="page-grid">
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
                copy="Try widening the status or source type filter to see more reading notes."
              />
            )}
          </Column>
        </Grid>
      </section>
    </>
  )
}

export default ReadingPage