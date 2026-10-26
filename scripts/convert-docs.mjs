import fs from 'node:fs/promises'
import path from 'node:path'
import mammoth from 'mammoth'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import {
  checksumFile,
  contentRoot,
  docsRoot,
  ensureDirectory,
  fileExists,
  findDocxFiles,
  getCollectionFromSourcePath,
  humanizeSlug,
  parseMarkdownFile,
  projectRoot,
  publicAssetsRoot,
  publicDocumentsRoot,
  slugify,
  stringifyMarkdownFile,
  estimateReadingTime,
} from './lib/content-utils.mjs'

const turndownService = new TurndownService({
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
  headingStyle: 'atx',
})

turndownService.use(gfm)

turndownService.addRule('articleNote', {
  filter: (node) => node.nodeName === 'P' && node.getAttribute('class') === 'article-note',
  replacement: (_content, node) => `\n\n${node.outerHTML.replace(/href="file:\/+datasets\//g, 'href="/datasets/')}\n\n`,
})

turndownService.addRule('wordTableCell', {
  filter: ['th', 'td'],
  replacement: (content, node) => {
    const firstCell = node === node.parentNode.firstChild
    return `${firstCell ? '| ' : ' '}${content.trim().replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|')} |`
  },
})

turndownService.addRule('footnoteReference', {
  filter: (node) => node.nodeName === 'SUP' && /^#footnote-\d+$/.test(node.firstChild?.getAttribute?.('href') || ''),
  replacement: (_content, node) => `[^${node.firstChild.getAttribute('href').slice('#footnote-'.length)}]`,
})

turndownService.addRule('footnoteBacklink', {
  filter: (node) => node.nodeName === 'A' && /^#footnote-ref-\d+$/.test(node.getAttribute('href') || ''),
  replacement: () => '',
})

turndownService.addRule('footnoteDefinition', {
  filter: (node) => node.nodeName === 'LI' && /^footnote-\d+$/.test(node.getAttribute('id') || ''),
  replacement: (content, node) => {
    const label = node.getAttribute('id').slice('footnote-'.length)
    return `\n\n[^${label}]: ${content.trim().replace(/\n/g, '\n    ')}\n\n`
  },
})

turndownService.addRule('footnoteList', {
  filter: (node) => node.nodeName === 'OL' && Array.from(node.childNodes)
    .filter((child) => child.nodeType === 1)
    .every((child) => /^footnote-\d+$/.test(child.getAttribute('id') || '')),
  replacement: (content) => `\n\n${content.trim()}\n\n`,
})

const mammothStyleMap = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => p:fresh",
  "p[style-name='Bibliography'] => p:fresh",
  "p[style-name='Caption'] => p:fresh",
  "p[style-name='Article Note'] => p.article-note:fresh",
]

function extractFirstHeading(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
}

function stripLeadingTitleHeading(markdown, title) {
  const lines = markdown.trim().split('\n')

  if (lines[0]?.startsWith('# ')) {
    const heading = lines[0].slice(2).trim()

    if (heading.toLowerCase() === title.trim().toLowerCase()) {
      return lines.slice(1).join('\n').trim()
    }
  }

  return markdown.trim()
}

function createWritingFrontmatter(existingData, metadata) {
  return {
    id: existingData.id || `writing-${metadata.slug}`,
    slug: metadata.slug,
    title: existingData.title || metadata.title,
    subtitle: existingData.subtitle || metadata.subtitle || '',
    summary: existingData.summary || 'TODO: add summary',
    subject: existingData.subject || 'TODO: assign subject',
    type: existingData.type || 'TODO: assign writing type',
    date: existingData.date || '',
    readingTime: metadata.readingTime,
    featured: typeof existingData.featured === 'boolean' ? existingData.featured : false,
    status: existingData.status || metadata.defaultStatus,
    tags: Array.isArray(existingData.tags) ? existingData.tags : [],
    sourceDocument: metadata.relativeSourcePath,
    relatedWriting: Array.isArray(existingData.relatedWriting) ? existingData.relatedWriting : [],
    context: existingData.context || '',
    teacherFeedback: existingData.teacherFeedback || '',
    reflection: existingData.reflection || '',
    sourceChecksum: metadata.checksum,
  }
}

function createReadingFrontmatter(existingData, metadata) {
  return {
    id: existingData.id || `reading-${metadata.slug}`,
    slug: metadata.slug,
    title: existingData.title || metadata.title,
    author: existingData.author || 'TODO: add author',
    publicationYear: existingData.publicationYear || '',
    subject: existingData.subject || 'TODO: assign subject',
    sourceType: existingData.sourceType || 'TODO: assign source type',
    readingStatus: existingData.readingStatus || 'To read',
    dateCompleted: existingData.dateCompleted || '',
    summary: existingData.summary || 'TODO: add summary',
    keyIdea: existingData.keyIdea || '',
    readingTime: metadata.readingTime,
    status: existingData.status || metadata.defaultStatus,
    tags: Array.isArray(existingData.tags) ? existingData.tags : [],
    sourceDocument: metadata.relativeSourcePath,
    relatedWriting: Array.isArray(existingData.relatedWriting) ? existingData.relatedWriting : [],
    sourceChecksum: metadata.checksum,
  }
}

async function convertDocxToMarkdown(sourcePath, collection, slug) {
  const assetDirectory = path.join(publicAssetsRoot, collection, slug)
  let imageIndex = 0

  await ensureDirectory(assetDirectory)

  const conversion = await mammoth.convertToHtml(
    { path: sourcePath },
    {
      styleMap: mammothStyleMap,
      convertImage: mammoth.images.imgElement(async (image) => {
        imageIndex += 1
        const extension = image.contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
        const filename = `image-${String(imageIndex).padStart(3, '0')}.${extension}`
        const buffer = await image.read()

        await fs.writeFile(path.join(assetDirectory, filename), buffer)

        return {
          alt: image.altText || '',
          src: `/document-assets/${collection}/${slug}/${filename}`,
        }
      }),
    },
  )

  return {
    markdown: turndownService.turndown(conversion.value).replace(/\n{3,}/g, '\n\n').trim(),
    messages: conversion.messages,
  }
}

async function copyLinkedDatasets(markdown) {
  const filenames = new Set(Array.from(markdown.matchAll(/href="\/datasets\/([a-zA-Z0-9_-]+\.csv)"/g), (match) => match[1]))
  for (const filename of filenames) {
    const destination = path.join(projectRoot, 'public', 'datasets', filename)
    await ensureDirectory(path.dirname(destination))
    await fs.copyFile(path.join(docsRoot, 'data', filename), destination)
  }
}

async function convertOneFile(sourcePath) {
  const { collection, defaultStatus, relativePath } = getCollectionFromSourcePath(sourcePath)
  const basename = path.basename(sourcePath, path.extname(sourcePath))
  const slug = slugify(basename)
  const checksum = await checksumFile(sourcePath)
  const targetMarkdownPath = path.join(contentRoot, collection, `${slug}.md`)
  const publicSourcePath = path.join(publicDocumentsRoot, relativePath)

  await ensureDirectory(path.dirname(targetMarkdownPath))
  await ensureDirectory(path.dirname(publicSourcePath))

  if (await fileExists(targetMarkdownPath)) {
    const existingRaw = await fs.readFile(targetMarkdownPath, 'utf8')
    const existingFile = parseMarkdownFile(existingRaw)

    if (existingFile.data.sourceChecksum === checksum) {
      await copyLinkedDatasets(existingFile.content)
      await fs.copyFile(sourcePath, publicSourcePath)
      return { status: 'skipped', sourcePath, targetMarkdownPath }
    }
  }

  const { markdown, messages } = await convertDocxToMarkdown(sourcePath, collection, slug)
  await copyLinkedDatasets(markdown)
  const existingRaw = await fileExists(targetMarkdownPath) ? await fs.readFile(targetMarkdownPath, 'utf8') : ''
  const existingFile = existingRaw ? parseMarkdownFile(existingRaw) : { data: {} }
  const inferredTitle = existingFile.data.title || extractFirstHeading(markdown) || humanizeSlug(slug)
  const markdownWithoutTitle = stripLeadingTitleHeading(markdown, inferredTitle)
  const inferredSubtitle = existingFile.data.subtitle || ''
  const cleanedMarkdown = markdownWithoutTitle
  const readingTime = estimateReadingTime(cleanedMarkdown)
  const metadata = {
    checksum,
    defaultStatus,
    readingTime,
    relativeSourcePath: relativePath,
    slug,
    subtitle: inferredSubtitle,
    title: inferredTitle,
  }

  const frontmatter = collection === 'writing'
    ? createWritingFrontmatter(existingFile.data, metadata)
    : createReadingFrontmatter(existingFile.data, metadata)

  await fs.writeFile(targetMarkdownPath, stringifyMarkdownFile(frontmatter, cleanedMarkdown), 'utf8')
  await fs.copyFile(sourcePath, publicSourcePath)

  return {
    messages,
    status: 'converted',
    sourcePath,
    targetMarkdownPath,
  }
}

async function main() {
  const requestedFilter = process.argv.slice(2).join(' ').trim().toLowerCase()
  const allDocxFiles = await findDocxFiles(docsRoot)
  const matchingFiles = requestedFilter
    ? allDocxFiles.filter((filePath) => filePath.toLowerCase().includes(requestedFilter))
    : allDocxFiles

  if (!allDocxFiles.length) {
    console.log('No .docx files found under docs/. Nothing to convert.')
    return
  }

  if (requestedFilter && !matchingFiles.length) {
    throw new Error(`No .docx files matched "${requestedFilter}" under docs/.`)
  }

  const results = { converted: [], failed: [], skipped: [] }

  for (const sourcePath of matchingFiles) {
    try {
      const result = await convertOneFile(sourcePath)
      results[result.status].push(result)
      const relativeSourcePath = path.relative(projectRoot, sourcePath)
      const relativeTargetPath = path.relative(projectRoot, result.targetMarkdownPath)

      if (result.status === 'converted') {
        console.log(`Converted ${relativeSourcePath} -> ${relativeTargetPath}`)
        for (const message of result.messages || []) {
          console.log(`  [${message.type}] ${message.message}`)
        }
      } else {
        console.log(`Skipped ${relativeSourcePath} (source unchanged)`)
      }
    } catch (error) {
      results.failed.push({ error, sourcePath })
      console.error(`Failed ${path.relative(projectRoot, sourcePath)}: ${error.message}`)
    }
  }

  console.log(`\nSummary: ${results.converted.length} converted, ${results.skipped.length} skipped, ${results.failed.length} failed.`)

  if (results.failed.length) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})