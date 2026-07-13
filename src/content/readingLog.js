import { sortByCompletionDateDescending } from '../utils/content.js'

export const READING_LOG_DOWNLOAD_PATH = '/reading-log.csv'

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
  const summary = String(row.summary || '').trim()
  const slug = String(row.slug || '').trim() || slugify(title)

  return {
    author: isPlaceholderText(row.author) ? 'Unknown author' : String(row.author).trim(),
    dateCompleted: String(row.dateCompleted || '').trim(),
    id: String(row.id || '').trim() || `reading-${slug}`,
    keyIdea: isPlaceholderText(row.keyIdea) ? summary : String(row.keyIdea).trim(),
    publicationYear: String(row.publicationYear || '').trim(),
    readingStatus: String(row.readingStatus || '').trim() || 'To read',
    relatedWriting: parseList(row.relatedWriting),
    slug,
    sourceDocument: String(row.sourceDocument || '').trim(),
    sourceType: isPlaceholderText(row.sourceType) ? 'Unassigned' : String(row.sourceType).trim(),
    status: String(row.status || '').trim() || 'review',
    subject: isPlaceholderText(row.subject) ? 'Unassigned' : String(row.subject).trim(),
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