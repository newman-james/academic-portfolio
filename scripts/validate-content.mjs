import fs from 'node:fs/promises'
import path from 'node:path'
import {
  contentRoot,
  docsRoot,
  fileExists,
  findDocxFiles,
  isPlaceholderValue,
  parseMarkdownFile,
  projectRoot,
  supportedStatuses,
} from './lib/content-utils.mjs'

async function findMarkdownFiles(targetPath) {
  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true })
    const nestedFiles = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(targetPath, entry.name)

        if (entry.isDirectory()) {
          return findMarkdownFiles(fullPath)
        }

        if (entry.isFile() && entry.name.endsWith('.md')) {
          return [fullPath]
        }

        return []
      }),
    )

    return nestedFiles.flat().sort()
  } catch {
    return []
  }
}

function validatePublishedWriting(entry, filePath, issues) {
  for (const field of ['id', 'slug', 'title', 'summary', 'subject', 'type', 'date', 'sourceDocument']) {
    if (isPlaceholderValue(entry.data[field])) {
      issues.push(`${filePath}: published writing is missing a usable ${field}`)
    }
  }
}

function validatePublishedReading(entry, filePath, issues) {
  for (const field of ['id', 'slug', 'title', 'author', 'subject', 'sourceType', 'readingStatus', 'sourceDocument']) {
    if (isPlaceholderValue(entry.data[field])) {
      issues.push(`${filePath}: published reading is missing a usable ${field}`)
    }
  }
}

async function main() {
  const markdownFiles = await findMarkdownFiles(contentRoot)
  const issues = []
  const seenIds = new Map()
  const seenSlugs = new Map()

  for (const filePath of markdownFiles) {
    const raw = await fs.readFile(filePath, 'utf8')
    const entry = parseMarkdownFile(raw)
    const relativePath = path.relative(projectRoot, filePath)
    const collection = relativePath.includes('/reading/')
      ? 'reading'
      : relativePath.includes('/writing/')
        ? 'writing'
        : null

    if (!collection) {
      continue
    }

    if (!entry.data.id) {
      issues.push(`${relativePath}: missing id`)
    } else if (seenIds.has(entry.data.id)) {
      issues.push(`${relativePath}: duplicate id ${entry.data.id} also used in ${seenIds.get(entry.data.id)}`)
    } else {
      seenIds.set(entry.data.id, relativePath)
    }

    if (!entry.data.slug) {
      issues.push(`${relativePath}: missing slug`)
    } else if (seenSlugs.has(entry.data.slug)) {
      issues.push(`${relativePath}: duplicate slug ${entry.data.slug} also used in ${seenSlugs.get(entry.data.slug)}`)
    } else {
      seenSlugs.set(entry.data.slug, relativePath)
    }

    if (!supportedStatuses.includes(entry.data.status)) {
      issues.push(`${relativePath}: status must be one of ${supportedStatuses.join(', ')}`)
    }

    if (!entry.data.sourceDocument) {
      issues.push(`${relativePath}: missing sourceDocument`)
    } else if (!(await fileExists(path.join(docsRoot, entry.data.sourceDocument)))) {
      issues.push(`${relativePath}: source document ${entry.data.sourceDocument} was not found under docs/`)
    }

    if (entry.data.status === 'published') {
      if (collection === 'writing') {
        validatePublishedWriting(entry, relativePath, issues)
      } else {
        validatePublishedReading(entry, relativePath, issues)
      }
    }
  }

  const docxFiles = await findDocxFiles(docsRoot)
  console.log(`Validated ${markdownFiles.length} Markdown files against ${docxFiles.length} source .docx files.`)

  if (issues.length) {
    for (const issue of issues) {
      console.error(`- ${issue}`)
    }

    process.exitCode = 1
    return
  }

  console.log('Content validation passed.')
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})