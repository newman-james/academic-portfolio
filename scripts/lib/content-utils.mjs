import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

export const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
export const docsRoot = path.join(projectRoot, 'docs')
export const contentRoot = path.join(projectRoot, 'content')
export const publicDocumentsRoot = path.join(projectRoot, 'public', 'documents')
export const publicAssetsRoot = path.join(projectRoot, 'public', 'document-assets')
export const supportedStatuses = ['draft', 'review', 'published', 'archived']
export const supportedCollections = ['writing', 'reading']

export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function humanizeSlug(value) {
  return String(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function estimateReadingTime(text) {
  const wordCount = String(text).trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 220))
}

export async function fileExists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

export async function ensureDirectory(targetPath) {
  await fs.mkdir(targetPath, { recursive: true })
}

export async function checksumFile(targetPath) {
  const buffer = await fs.readFile(targetPath)
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function findDocxFiles(targetPath) {
  const entries = await fs.readdir(targetPath, { withFileTypes: true })
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(targetPath, entry.name)

      if (entry.isDirectory()) {
        return findDocxFiles(fullPath)
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.docx')) {
        return [fullPath]
      }

      return []
    }),
  )

  return nestedFiles.flat().sort()
}

export function getCollectionFromSourcePath(sourcePath) {
  const relativePath = path.relative(docsRoot, sourcePath)
  const segments = relativePath.split(path.sep)
  const collection = segments.find((segment) => supportedCollections.includes(segment))

  if (!collection) {
    throw new Error(`Could not determine collection for ${relativePath}. Place source files under docs/writing, docs/reading, or docs/drafts/<collection>.`)
  }

  return {
    collection,
    defaultStatus: segments[0] === 'drafts' ? 'draft' : 'review',
    relativePath: relativePath.split(path.sep).join('/'),
  }
}

export function parseMarkdownFile(rawContent) {
  return matter(rawContent)
}

export function stringifyMarkdownFile(frontmatter, body) {
  return matter.stringify(body.trim() ? `${body.trim()}\n` : '', frontmatter)
}

export function isPlaceholderValue(value) {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim() === '' || value.startsWith('TODO:') || value === 'TODO'
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  return false
}