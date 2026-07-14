const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g
let activeExportFrame = null

const getAppBaseUrl = () => new URL(import.meta.env.BASE_URL, window.location.origin)

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

  const url = new URL(`writing/${entry.slug}/print`, getAppBaseUrl())

  if (autoPrint) {
    url.searchParams.set('autoprint', '1')
  }

  return url.toString()
}

const removeExportFrame = () => {
  if (!activeExportFrame) {
    return
  }

  activeExportFrame.onload = null
  activeExportFrame.remove()
  activeExportFrame = null
}

export const getWritingPrintUrl = ({ entry, autoPrint = false }) => buildPrintUrl({ entry, autoPrint })

export const exportWritingToPdf = async ({ entry }) => {
  if (!entry?.body) {
    throw new Error('No writing content is available to export.')
  }

  removeExportFrame()

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.inlineSize = '0'
  iframe.style.blockSize = '0'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
  iframe.style.border = '0'
  iframe.style.inset = '0'
  iframe.src = buildPrintUrl({ entry })
  activeExportFrame = iframe

  await new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(loadTimeout)
    }

    const loadTimeout = window.setTimeout(() => {
      cleanup()
      removeExportFrame()
      reject(new Error('PDF export timed out before the print dialog opened.'))
    }, 15000)

    iframe.onload = async () => {
      cleanup()

      try {
        const frameWindow = iframe.contentWindow
        const frameDocument = iframe.contentDocument

        if (!frameWindow || !frameDocument) {
          throw new Error('PDF export preview could not be prepared.')
        }

        if (frameDocument.fonts?.ready) {
          await frameDocument.fonts.ready
        }

        await new Promise((nextFrame) => frameWindow.requestAnimationFrame(() => nextFrame()))
        await new Promise((nextFrame) => frameWindow.requestAnimationFrame(() => nextFrame()))

        const cleanupAfterPrint = () => {
          frameWindow.removeEventListener('afterprint', cleanupAfterPrint)
          window.setTimeout(removeExportFrame, 0)
        }

        frameWindow.addEventListener('afterprint', cleanupAfterPrint)
        frameDocument.title = getWritingPdfFileName(entry).replace(/\.pdf$/i, '')
        frameWindow.focus()
        frameWindow.print()
        resolve()
      } catch (error) {
        removeExportFrame()
        reject(error instanceof Error ? error : new Error('PDF export failed to initialise.'))
      }
    }

    document.body.appendChild(iframe)
  })
}