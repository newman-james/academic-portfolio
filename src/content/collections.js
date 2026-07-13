import YAML from 'yaml'

const isDevelopmentPreview = import.meta.env.DEV

const rawWritingModules = import.meta.glob('../../content/writing/**/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
})

const rawReadingModules = import.meta.glob('../../content/reading/**/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
})

function extractFirstParagraph(markdown) {
  const paragraph = markdown
    .split(/\n\n+/)
    .map((block) => block.trim())
    .find((block) => block && !block.startsWith('#') && !block.startsWith('![') && !block.startsWith('|') && !block.startsWith('>') && !block.startsWith('```') && !block.startsWith('<'))

  return paragraph ? paragraph.replace(/\[(.*?)\]\((.*?)\)/g, '$1').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''
}

function isPlaceholderText(value) {
  return !value || /^TODO:?/i.test(String(value).trim())
}

function estimateReadingTime(text) {
  const wordCount = String(text).trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 220))
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)

  if (!match) {
    return {
      content: raw,
      data: {},
    }
  }

  return {
    content: match[2],
    data: YAML.parse(match[1]) || {},
  }
}

function normalizeCommonEntry(pathname, raw, collection) {
  const parsed = parseFrontmatter(raw)
  const fallbackSlug = pathname.split('/').pop().replace(/\.md$/, '')
  const body = parsed.content.trim()
  const fallbackExcerpt = extractFirstParagraph(body)

  return {
    ...parsed.data,
    body,
    collection,
    excerpt: isPlaceholderText(parsed.data.summary) ? fallbackExcerpt : parsed.data.summary,
    featured: Boolean(parsed.data.featured),
    id: parsed.data.id || `${collection}-${fallbackSlug}`,
    path: pathname,
    readingTime: Number(parsed.data.readingTime) || estimateReadingTime(body),
    slug: parsed.data.slug || fallbackSlug,
    sourceDocument: parsed.data.sourceDocument || '',
    status: parsed.data.status || 'review',
    tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
    title: parsed.data.title || fallbackSlug.replace(/[-_]+/g, ' '),
  }
}

function isPreviewVisibleEntry(entry) {
  return entry.status === 'published' || (isDevelopmentPreview && entry.status === 'review')
}

function normalizeWritingEntry(pathname, raw) {
  const entry = normalizeCommonEntry(pathname, raw, 'writing')

  return {
    ...entry,
    context: entry.context || '',
    date: entry.date || '',
    reflection: entry.reflection || '',
    relatedWriting: Array.isArray(entry.relatedWriting) ? entry.relatedWriting : [],
    subject: isPlaceholderText(entry.subject) ? 'Unassigned' : entry.subject,
    subtitle: isPlaceholderText(entry.subtitle) ? '' : entry.subtitle,
    teacherFeedback: isPlaceholderText(entry.teacherFeedback) ? '' : entry.teacherFeedback,
    type: isPlaceholderText(entry.type) ? 'Unassigned' : entry.type,
  }
}

function normalizeReadingEntry(pathname, raw) {
  const entry = normalizeCommonEntry(pathname, raw, 'reading')

  return {
    ...entry,
    author: isPlaceholderText(entry.author) ? 'Unknown author' : entry.author,
    dateCompleted: entry.dateCompleted || '',
    keyIdea: entry.keyIdea || entry.excerpt,
    publicationYear: entry.publicationYear || '',
    readingStatus: entry.readingStatus || 'To read',
    relatedWriting: Array.isArray(entry.relatedWriting) ? entry.relatedWriting : [],
    sourceType: isPlaceholderText(entry.sourceType) ? 'Unassigned' : entry.sourceType,
    subject: isPlaceholderText(entry.subject) ? 'Unassigned' : entry.subject,
    summary: entry.summary || entry.excerpt,
  }
}

function sortByDateDescending(items, fieldName) {
  return [...items].sort((left, right) => {
    if (!left[fieldName] && !right[fieldName]) {
      return left.title.localeCompare(right.title)
    }

    if (!left[fieldName]) {
      return 1
    }

    if (!right[fieldName]) {
      return -1
    }

    return new Date(right[fieldName]) - new Date(left[fieldName])
  })
}

export const allWriting = sortByDateDescending(
  Object.entries(rawWritingModules).map(([pathname, raw]) => normalizeWritingEntry(pathname, raw)),
  'date',
)

export const visibleWriting = allWriting.filter(isPreviewVisibleEntry)
export const publishedWriting = allWriting.filter((entry) => entry.status === 'published')

export const allReading = sortByDateDescending(
  Object.entries(rawReadingModules).map(([pathname, raw]) => normalizeReadingEntry(pathname, raw)),
  'dateCompleted',
)

export const visibleReading = allReading.filter(isPreviewVisibleEntry)
export const publishedReading = allReading.filter((entry) => entry.status === 'published')

export function getWritingBySlug(slug) {
  return allWriting.find((entry) => entry.slug === slug) ?? null
}

export function getVisibleWritingTypes() {
  return [...new Set(visibleWriting.map((entry) => entry.type).filter(Boolean))].sort()
}

export function getVisibleReadingSourceTypes() {
  return [...new Set(visibleReading.map((entry) => entry.sourceType).filter(Boolean))].sort()
}

export function getVisibleReadingStatuses() {
  return [...new Set(visibleReading.map((entry) => entry.readingStatus).filter(Boolean))].sort()
}