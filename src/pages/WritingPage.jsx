import { Button, Column, Grid, InlineNotification, Tag, Tile } from '@carbon/react'
import { ArrowRight, Download, Maximize, Minimize } from '@carbon/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { allWriting, visibleWriting } from '../content/collections.js'
import MarkdownArticle from '../components/MarkdownArticle.jsx'
import PageShell from '../components/PageShell.jsx'
import { siteDescription } from '../data/site.js'
import useDocumentMeta from '../hooks/useDocumentMeta.js'
import { formatDate, formatReadingTime, formatStatusLabel, getDisplaySummary, sortByDateDescending, truncateToWordCount } from '../utils/content.js'
import { exportWritingToPdf } from '../utils/writingPdf.js'
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

function getSourceDocumentUrl(sourceDocument) {
  if (!sourceDocument) {
    return ''
  }

  return new URL(`documents/${sourceDocument}`, new URL(import.meta.env.BASE_URL, window.location.origin)).toString()
}

function WritingPage({ printMode = false }) {
  const documentArticleRef = useRef(null)
  const navigate = useNavigate()
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [exportState, setExportState] = useState('idle')
  const [exportError, setExportError] = useState('')
  const [isArticleFullscreen, setIsArticleFullscreen] = useState(false)
  const availableWriting = visibleWriting.length ? visibleWriting : allWriting
  const orderedWriting = useMemo(() => sortByDateDescending(availableWriting), [availableWriting])
  const selectedEntry = useMemo(
    () => orderedWriting.find((entry) => entry.slug === slug) ?? orderedWriting[0] ?? null,
    [orderedWriting, slug],
  )
  const autoPrint = printMode && searchParams.get('autoprint') === '1'
  const tableOfContents = selectedEntry ? extractTableOfContents(selectedEntry.body) : []
  const relatedPieces = selectedEntry
    ? orderedWriting.filter((entry) => selectedEntry.relatedWriting?.includes(entry.id))
    : []
  const sourceDocumentUrl = selectedEntry ? getSourceDocumentUrl(selectedEntry.sourceDocument) : ''
  const openEntry = (entry) => {
    navigate(`/writing/${entry.slug}`)
  }
  const documentMeta = selectedEntry
    ? [formatDate(selectedEntry.date), formatReadingTime(selectedEntry.readingTime)]
        .filter(Boolean)
        .join(' · ')
    : ''

  useDocumentMeta(
    'Academic writing portfolio',
    selectedEntry ? getDisplaySummary(selectedEntry) : `Browse essays, research notes and reflections. ${siteDescription}`,
  )

  useEffect(() => {
    if (printMode || typeof document === 'undefined') {
      return undefined
    }

    document.title = 'James Newman academic writing portfolio'

    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      ogTitle.setAttribute('content', 'James Newman academic writing portfolio')
    }

    return undefined
  }, [printMode, selectedEntry])

  useEffect(() => {
    if (printMode || typeof document === 'undefined') {
      return undefined
    }

    const handleFullscreenChange = () => {
      setIsArticleFullscreen(document.fullscreenElement === documentArticleRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [printMode])

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

  const handleToggleFullscreen = async () => {
    if (printMode || !documentArticleRef.current || typeof document === 'undefined') {
      return
    }

    try {
      if (document.fullscreenElement === documentArticleRef.current) {
        await document.exitFullscreen()
        return
      }

      await documentArticleRef.current.requestFullscreen()
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Fullscreen mode failed to initialise.')
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
      setExportError(error instanceof Error ? error.message : 'PDF export failed to initialise.')
    }
  }

  const documentArticle = selectedEntry ? (
    <article ref={documentArticleRef} className={`documentation-page__document${isArticleFullscreen ? ' documentation-page__document--fullscreen' : ''}`}>
      <div className="documentation-page__document-controls no-print">
        <Button
          aria-label={isArticleFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          kind="ghost"
          hasIconOnly
          iconDescription={isArticleFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          renderIcon={isArticleFullscreen ? Minimize : Maximize}
          size="sm"
          tooltipAlignment="end"
          tooltipPosition="left"
          onClick={handleToggleFullscreen}
        />
      </div>
      <header className="documentation-page__document-header">
        <h2 className="documentation-page__document-title">{selectedEntry.title}</h2>
        <p className="documentation-page__document-meta">{documentMeta}</p>
        <p className="documentation-page__document-summary">{selectedEntry.subtitle || getDisplaySummary(selectedEntry)}</p>
      </header>

      <MarkdownArticle className="documentation-page__markdown markdown-content" content={selectedEntry.body} />

      <div className="writing-page__article-actions no-print">
        <div className="writing-page__toolbar">
          <Button
            as="a"
            href={sourceDocumentUrl}
            kind="tertiary"
            rel="noreferrer"
            renderIcon={Download}
            target="_blank"
          >
            Open source document
          </Button>
          <Button
            kind="primary"
            size="sm"
            renderIcon={Download}
            disabled={exportState === 'exporting'}
            onClick={handleExportPdf}
          >
            {exportState === 'exporting' ? 'Preparing PDF export...' : 'Export PDF'}
          </Button>
        </div>
        {exportError ? (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Reader control failed"
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
    <PageShell className="documentation-page writing-page">
      <header className="documentation-page__page-header">
        <div>
          <p className="documentation-page__page-eyebrow">Writing</p>
          <h1 className="documentation-page__page-title">James Newman academic writing portfolio</h1>
          <p className="documentation-page__page-copy">
            A curated portfolio of essays and position papers demonstrating independent research, critical analysis and the development of evidence-led arguments across economics, business and contemporary affairs.
          </p>
        </div>
      </header>

      <div className="documentation-page__reader-layout">
        <aside className="documentation-page__sidebar" aria-label="Writing navigation">
          {selectedEntry ? (
            <>
              <Tile className="documentation-page__panel">
                <div className="documentation-page__panel-header">
                  <div>
                    <h2 className="documentation-page__panel-title">Metadata</h2>
                  </div>
                </div>

                <div className="documentation-page__metadata-grid">
                  <span>Keywords</span>
                  <div className="documentation-page__metadata-value">
                    <strong>{selectedEntry.tags.join(', ')}</strong>
                  </div>
                  <span>Words</span><strong>{estimateWordCount(selectedEntry.body)}</strong>
                  <span>Reading time</span><strong>{formatReadingTime(selectedEntry.readingTime)}</strong>
                  <span>Date published</span><strong>{formatDate(selectedEntry.date)}</strong>
                </div>
              </Tile>

              <Tile className="documentation-page__panel">
                <div className="documentation-page__panel-header">
                  <div>
                    <h2 className="documentation-page__panel-title">Contents</h2>
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

              <Tile className="documentation-page__panel documentation-page__panel--documents">
                <div className="documentation-page__panel-header">
                  <div>
                    <h2 className="documentation-page__panel-title">Documents</h2>
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
                      <strong>{entry.title}</strong>
                      <p>{truncateToWordCount(getDisplaySummary(entry), CATALOGUE_EXCERPT_WORD_LIMIT)}</p>
                      <div className="documentation-page__catalogue-footer">
                        <span>{estimateWordCount(entry.body)} words</span>
                      </div>
                    </button>
                  ))}
                </div>
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
    </PageShell>
  )
}

export default WritingPage
