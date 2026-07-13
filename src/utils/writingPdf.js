const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g

const sanitizeFileName = (value) => String(value)
  .replace(INVALID_FILENAME_CHARS, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const getWritingPdfFileName = (entry) => {
  const baseName = sanitizeFileName(`${entry?.id || entry?.slug || 'writing'} ${entry?.title || ''}`)
  return `${baseName}.pdf`
}

const buildPrintUrl = ({ entry, autoPrint = false }) => {
  if (!entry?.slug) {
    throw new Error('No writing route is available to export.')
  }

  const url = new URL(`${window.location.origin}/writing/${entry.slug}/print`)

  if (autoPrint) {
    url.searchParams.set('autoprint', '1')
  }

  return url.toString()
}

const openPrintWindow = (url) => {
  const printWindow = window.open(url, '_blank', 'noopener,noreferrer')

  if (!printWindow) {
    throw new Error('Unable to open the print preview window. Allow pop-ups and try again.')
  }

  return printWindow
}

export const getWritingPrintUrl = ({ entry, autoPrint = false }) => buildPrintUrl({ entry, autoPrint })

export const openWritingPrintPreview = ({ entry }) => openPrintWindow(buildPrintUrl({ entry }))

export const exportWritingToPdf = async ({ entry }) => {
  if (!entry?.body) {
    throw new Error('No writing content is available to export.')
  }

  openPrintWindow(buildPrintUrl({ entry, autoPrint: true }))
}