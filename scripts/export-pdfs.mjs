import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { checksumFile, docsRoot, fileExists, findDocxFiles, publicDocumentsRoot } from './lib/content-utils.mjs'

if (process.platform !== 'darwin') {
  throw new Error('PDF export requires Microsoft Word on macOS. Export and commit PDFs before building on other platforms.')
}

const filter = process.argv.slice(2).join(' ').trim().toLowerCase()
const manifestPath = path.join(publicDocumentsRoot, 'pdf-manifest.json')
const manifest = filter && await fileExists(manifestPath)
  ? JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  : {}
const sources = await findDocxFiles(path.join(docsRoot, 'writing'))
const matchingSources = filter ? sources.filter(source => source.toLowerCase().includes(filter)) : sources
if (filter && !matchingSources.length) throw new Error(`No writing document matched "${filter}".`)
const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-word-pdf-'))
try {
  for (const source of matchingSources) {
    const relative = path.relative(docsRoot, source).split(path.sep).join('/')
    const destination = path.join(publicDocumentsRoot, relative.replace(/\.docx$/i, '.pdf'))
    const temporarySource = path.join(temporaryDirectory, `${path.basename(temporaryDirectory)}-${path.basename(source)}`)
    const temporaryPdf = temporarySource.replace(/\.docx$/i, '.pdf')
    await fs.copyFile(source, temporarySource)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    execFileSync('osascript', ['-e', `
on run argv
  set sourceFile to POSIX file (item 1 of argv)
  tell application "Microsoft Word"
    open sourceFile
    set exportDocument to missing value
    repeat 100 times
      if exists document (item 3 of argv) then set exportDocument to document (item 3 of argv)
      if exportDocument is not missing value then exit repeat
      delay 0.1
    end repeat
    if exportDocument is missing value then error "Word did not open the export copy."
    try
      save as exportDocument file name (item 2 of argv) file format format PDF
    on error messageText number errorNumber
      close exportDocument saving no
      error messageText number errorNumber
    end try
    close exportDocument saving no
  end tell
end run
`, temporarySource, temporaryPdf, path.basename(temporarySource)], { timeout: 120000, stdio: 'pipe' })
    const bytes = await fs.readFile(temporaryPdf)
    if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error(`Invalid PDF export: ${temporaryPdf}`)
    await fs.copyFile(temporaryPdf, destination)
    manifest[relative] = {
      sourceChecksum: await checksumFile(source),
      pdfChecksum: await checksumFile(destination),
    }
    console.log(`Exported Word PDF: ${relative}`)
  }
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
} finally {
  await fs.rm(temporaryDirectory, { recursive: true, force: true })
}
