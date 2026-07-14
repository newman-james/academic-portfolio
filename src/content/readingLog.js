import { sortByCompletionDateDescending } from '../utils/content.js'

const APP_BASE_PATH = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`

export const READING_LOG_DOWNLOAD_PATH = `${APP_BASE_PATH}reading-logs/reading-log-aug26.csv`
export const READING_LOG_DOWNLOAD_FILENAME = 'reading-log-aug26.csv'

const isDevelopmentPreview = import.meta.env.DEV

function parseCsv(text) {
  const rows = []
  let currentRow = []
  let currentValue = ''
  let insideQuotes = false

  const normalizedText = String(text).replace(/^\uFEFF/, '')

  for (let index = 0; index < normalizedText.length; index += 1) {
    const character = normalizedText[index]
    const nextCharacter = normalizedText[index + 1]

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }

      continue
    }

    if (character === ',' && !insideQuotes) {
      currentRow.push(currentValue)
      currentValue = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !insideQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }

      currentRow.push(currentValue)

      if (currentRow.some((value) => value.trim() !== '')) {
        rows.push(currentRow)
      }

      currentRow = []
      currentValue = ''
      continue
    }

    currentValue += character
  }

  currentRow.push(currentValue)

  if (currentRow.some((value) => value.trim() !== '')) {
    rows.push(currentRow)
  }

  if (!rows.length) {
    return []
  }

  const [headerRow, ...dataRows] = rows

  return dataRows.map((row) => Object.fromEntries(headerRow.map((header, index) => [header, row[index] ?? ''])))
}

function isPlaceholderText(value) {
  return !value || /^TODO:?/i.test(String(value).trim())
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseList(value) {
  return String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
}

function isPreviewVisibleEntry(entry) {
  return entry.status === 'published' || (isDevelopmentPreview && entry.status === 'review')
}

function normalizeReadingCsvEntry(row) {
  const title = String(row.title || '').trim() || 'Untitled reading entry'
  const summary = String(row.summary || row.note || '').trim()
  const slug = String(row.slug || '').trim() || slugify(title)
  const relatedWriting = parseList(row.relatedWriting)
  const status = String(row.status || '').trim() || 'published'

  return {
    author: isPlaceholderText(row.author || row.creator) ? 'Unknown author' : String(row.author || row.creator).trim(),
    dateCompleted: String(row.dateCompleted || '').trim(),
    id: String(row.id || '').trim() || `reading-${slug}`,
    keyIdea: isPlaceholderText(row.keyIdea) ? summary : String(row.keyIdea).trim(),
    publicationYear: String(row.publicationYear || row.year || '').trim(),
    readingStatus: String(row.readingStatus || '').trim() || 'Logged',
    relatedWriting,
    slug,
    sourceDocument: String(row.sourceDocument || row.url || '').trim(),
    sourceType: isPlaceholderText(row.sourceType || row.category) ? 'Unassigned' : String(row.sourceType || row.category).trim(),
    status,
    subject: isPlaceholderText(row.subject || row.topic) ? 'Unassigned' : String(row.subject || row.topic).trim(),
    summary,
    tags: parseList(row.tags),
    title,
  }
}

export async function fetchVisibleReadingLog() {
  const response = await fetch(READING_LOG_DOWNLOAD_PATH)

  if (!response.ok) {
    throw new Error(`Unable to load reading log CSV: ${response.status}`)
  }

  const csvText = await response.text()
  const entries = parseCsv(csvText).map(normalizeReadingCsvEntry)

  return sortByCompletionDateDescending(entries.filter(isPreviewVisibleEntry))
}

export function getVisibleReadingSourceTypes(entries) {
  return [...new Set(entries.map((entry) => entry.sourceType).filter(Boolean))].sort()
}

export function getVisibleReadingStatuses(entries) {
  return [...new Set(entries.map((entry) => entry.readingStatus).filter(Boolean))].sort()
}