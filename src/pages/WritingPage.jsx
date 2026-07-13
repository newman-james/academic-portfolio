import { Button, Column, Grid, InlineNotification, Tag, Tile } from '@carbon/react'
import { ArrowRight, Download } from '@carbon/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { visibleWriting } from '../content/collections.js'
import MarkdownArticle from '../components/MarkdownArticle.jsx'
import { siteDescription } from '../data/site.js'
import useDocumentMeta from '../hooks/useDocumentMeta.js'
import { formatDate, formatReadingTime, formatStatusLabel, getDisplaySummary, sortByDateDescending, truncateToWordCount } from '../utils/content.js'
import { exportWritingToPdf, openWritingPrintPreview } from '../utils/writingPdf.js'
import './WritingPage.scss'

const CATALOGUE_EXCERPT_WORD_LIMIT = 19

function slugifyHeading(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractTableOfContents(markdown) {
  return markdown
    .split('\n')
    .map((line) => line.match(/^(#{1,3})\s+(.+)$/))
    .filter(Boolean)
    .map((match) => ({
      id: slugifyHeading(match[2]),
      heading: match[2].trim(),
      level: match[1].length,
    }))
}

function estimateWordCount(body) {
  return String(body)
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
}

function WritingPage({ printMode = false }) {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [exportState, setExportState] = useState('idle')
  const [exportError, setExportError] = useState('')
  const orderedWriting = useMemo(() => sortByDateDescending(visibleWriting), [])
  const selectedEntry = useMemo(
    () => orderedWriting.find((entry) => entry.slug === slug) ?? orderedWriting[0] ?? null,
    [orderedWriting, slug],
  )
  const autoPrint = printMode && searchParams.get('autoprint') === '1'
  const tableOfContents = selectedEntry ? extractTableOfContents(selectedEntry.body) : []
  const relatedPieces = selectedEntry
    ? orderedWriting.filter((entry) => selectedEntry.relatedWriting?.includes(entry.id))
    : []
  const openEntry = (entry) => {
    navigate(`/writing/${entry.slug}`)
  }
  const documentMeta = selectedEntry
    ? [selectedEntry.status === 'review' ? 'Review' : null, formatDate(selectedEntry.date), formatReadingTime(selectedEntry.readingTime)]
        .filter(Boolean)
        .join(' · ')
    : ''

  useDocumentMeta(
    selectedEntry ? `${selectedEntry.title}` : 'Writing',
    selectedEntry ? getDisplaySummary(selectedEntry) : `Browse essays, research notes and reflections. ${siteDescription}`,
  )

  useEffect(() => {
    if (!printMode || !selectedEntry) {
      return undefined
    }

    const previousTitle = document.title
    document.title = `${selectedEntry.id} ${selectedEntry.title}`

    return () => {
      document.title = previousTitle
    }
  }, [printMode, selectedEntry])

  useEffect(() => {
    if (!printMode || !autoPrint) {
      return undefined
    }

    let cancelled = false

    const triggerPrint = async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready
      }

      await new Promise((resolve) => window.requestAnimationFrame(() => resolve()))
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve()))

      if (cancelled) {
        return
      }

      const closeAfterPrint = () => {
        window.removeEventListener('afterprint', closeAfterPrint)
        if (window.opener) {
          window.close()
        }
      }

      window.addEventListener('afterprint', closeAfterPrint)
      window.print()
    }

    triggerPrint().catch(() => {
      setExportError('Print preview failed to initialise.')
    })

    return () => {
      cancelled = true
    }
  }, [autoPrint, printMode])

  const handlePrint = () => {
    if (!selectedEntry) {
      return
    }

    try {
      openWritingPrintPreview({ entry: selectedEntry })
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Print preview failed.')
    }
  }

  const handleExportPdf = async () => {
    if (!selectedEntry) {
      return
    }

    setExportState('exporting')
    setExportError('')

    try {
      await exportWritingToPdf({ entry: selectedEntry })
      setExportState('idle')
    } catch (error) {
      setExportState('idle')
      setExportError(error instanceof Error ? error.message : 'PDF export failed.')
    }
  }

  const documentArticle = selectedEntry ? (
    <article className="documentation-page__document">
      <header className="documentation-page__document-header">
        <p className="documentation-page__document-kicker">{selectedEntry.id}</p>
        <h2 className="documentation-page__document-title">{selectedEntry.title}</h2>
        <p className="documentation-page__document-meta">{documentMeta}</p>
        <p className="documentation-page__document-summary">{selectedEntry.subtitle || getDisplaySummary(selectedEntry)}</p>
      </header>

      <MarkdownArticle className="documentation-page__markdown markdown-content" content={selectedEntry.body} />

      <div className="writing-page__article-actions no-print">
        <div className="writing-page__toolbar">
          <Button kind="ghost" size="sm" onClick={handlePrint}>Print</Button>
          <Button
            kind="primary"
            size="sm"
            renderIcon={Download}
            disabled={exportState === 'exporting'}
            onClick={handleExportPdf}
          >
            {exportState === 'exporting' ? 'Opening PDF export...' : 'Export PDF'}
          </Button>
        </div>
        {exportError ? (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="PDF export failed"
            subtitle={exportError}
          />
        ) : null}
      </div>
    </article>
  ) : (
    <Tile className="documentation-page__panel">
      <div className="documentation-page__empty-state">
        <h2>No writing selected</h2>
        <p>Choose a writing entry from the catalogue to open the seeded reader.</p>
      </div>
    </Tile>
  )

  if (printMode) {
    return (
      <div className="documentation-page writing-page writing-page--print">
        <Grid className="page-grid">
          <Column sm={4} md={8} lg={16}>
            {exportError ? (
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title="Print preview failed"
                subtitle={exportError}
              />
            ) : null}
            {documentArticle}
          </Column>
        </Grid>
      </div>
    )
  }

  return (
    <div className="documentation-page writing-page">
      <Grid className="page-grid">
        <Column sm={4} md={8} lg={16}>
          <header className="documentation-page__page-header">
            <div>
              <p className="documentation-page__page-eyebrow">Writing</p>
              <h1 className="documentation-page__page-title">Writing</h1>
              <p className="documentation-page__page-copy">
                A report-style writing reader for essays, position papers and durable academic work sourced from the local Word-backed archive.
              </p>
            </div>
            <div className="documentation-page__header-actions">
              <Tag size="md" type="blue">Word-backed</Tag>
              <Tag size="md" type="cool-gray">Read only</Tag>
            </div>
          </header>
        </Column>

        <Column sm={4} md={8} lg={16}>
          <div className="documentation-page__reader-layout">
            <aside className="documentation-page__sidebar" aria-label="Writing navigation">
              <Tile className="documentation-page__panel documentation-page__panel--intro">
                <p className="documentation-page__panel-eyebrow">Library</p>
                <h2 className="documentation-page__panel-title">Writing catalogue</h2>
                <p className="documentation-page__panel-copy">
                  Word-backed writing pieces discovered from the local portfolio workspace.
                </p>
              </Tile>

              {selectedEntry ? (
                <>
                  <Tile className="documentation-page__panel">
                    <div className="documentation-page__panel-header">
                      <div>
                        <h2 className="documentation-page__panel-title">Contents</h2>
                        <p className="documentation-page__panel-copy">Auto-seeded reader outline</p>
                      </div>
                    </div>

                    <nav className="documentation-page__toc" aria-label="Document contents">
                      {tableOfContents.map((section) => (
                        <a key={section.id} href={`#${section.id}`} className="documentation-page__toc-link">
                          {section.heading}
                        </a>
                      ))}
                    </nav>
                  </Tile>

                  <Tile className="documentation-page__panel">
                    <div className="documentation-page__panel-header">
                      <div>
                        <h2 className="documentation-page__panel-title">Documents</h2>
                        <p className="documentation-page__panel-copy">{orderedWriting.length} seeded item{orderedWriting.length === 1 ? '' : 's'}</p>
                      </div>
                    </div>

                    <div className="documentation-page__catalogue-list">
                      {orderedWriting.map((entry) => (
                        <button
                          key={entry.slug}
                          type="button"
                          className={`documentation-page__catalogue-item${selectedEntry?.slug === entry.slug ? ' documentation-page__catalogue-item--active' : ''}`}
                          onClick={() => openEntry(entry)}
                        >
                          <div className="documentation-page__catalogue-meta">
                            <span>{entry.id}</span>
                            <Tag size="sm" type={entry.status === 'review' ? 'purple' : 'green'}>
                              {formatStatusLabel(entry.status)}
                            </Tag>
                          </div>
                          <strong>{entry.title}</strong>
                          <p>{truncateToWordCount(getDisplaySummary(entry), CATALOGUE_EXCERPT_WORD_LIMIT)}</p>
                          <div className="documentation-page__catalogue-footer">
                            <span>Word (.docx)</span>
                            <span>{estimateWordCount(entry.body)} words</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </Tile>

                  <Tile className="documentation-page__panel">
                    <div className="documentation-page__panel-header">
                      <div>
                        <h2 className="documentation-page__panel-title">Metadata</h2>
                        <p className="documentation-page__panel-copy">Current document context</p>
                      </div>
                    </div>

                    <div className="documentation-page__metadata-grid">
                      <span>ID</span><strong>{selectedEntry.id}</strong>
                      <span>Status</span><strong>{formatStatusLabel(selectedEntry.status)}</strong>
                      <span>Source</span><strong>Word (.docx)</strong>
                      <span>Words</span><strong>{estimateWordCount(selectedEntry.body)}</strong>
                      <span>Reading time</span><strong>{formatReadingTime(selectedEntry.readingTime)}</strong>
                      <span>Date</span><strong>{formatDate(selectedEntry.date)}</strong>
                    </div>

                    {selectedEntry.tags.length ? (
                      <div className="documentation-page__tag-row">
                        {selectedEntry.tags.map((tag) => (
                          <Tag key={tag} size="sm" type="cool-gray">{tag}</Tag>
                        ))}
                        {selectedEntry.featured ? <Tag size="sm" type="warm-red">Featured</Tag> : null}
                      </div>
                    ) : null}

                    <Button
                      as="a"
                      href={`/documents/${selectedEntry.sourceDocument}`}
                      kind="tertiary"
                      renderIcon={Download}
                    >
                      Open source document
                    </Button>
                  </Tile>
                </>
              ) : null}
            </aside>

            <div className="documentation-page__reader-stage">
              {documentArticle}

              {relatedPieces.length ? (
                <div className="documentation-page__related-note">
                  <span>Related writing</span>
                  <button type="button" className="documentation-page__related-link" onClick={() => openEntry(relatedPieces[0])}>
                    Continue with {relatedPieces[0].title}
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </Column>
      </Grid>
    </div>
  )
}

export default WritingPage