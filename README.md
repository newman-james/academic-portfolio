# Academic Portfolio

Local-first academic writing portfolio built with React, Vite, JavaScript and IBM Carbon Design System v11.

Live site:

- https://newman-james.github.io/academic-portfolio/

This version uses a document-led workflow:

- Microsoft Word documents in `docs/` are the canonical source material.
- Generated Markdown in `content/` is the reviewable publishing format consumed by the React app.
- Extracted images are stored in `public/document-assets/`.
- Source `.docx` files are copied into `public/documents/` so they remain directly available from the site.

## Reference implementation followed

Before introducing the conversion pipeline, the local `innovation-design` repository was inspected.

The portfolio follows these established patterns from that repo wherever practical:

- top-level `docs/` as the source-of-truth document location
- public exposure of source documents from the frontend
- Carbon-token-based Markdown styling rather than browser-default prose styling
- a dedicated long-form reader surface separate from navigation and filters
- stable slugs and document identifiers derived from file naming rather than UI-only state

The reference repo does not currently implement a full automated Word-to-Markdown ingestion script, so this repository adds that missing local pipeline while keeping the same document-first architecture.

## Stack

- React 19
- Vite
- JavaScript
- React Router
- IBM Carbon Design System v11 via `@carbon/react`
- `@carbon/icons-react`
- Sass
- `mammoth` for local `.docx` to HTML conversion
- `turndown` with GFM support for HTML to Markdown conversion
- `react-markdown` with `remark-gfm` for safe Markdown rendering
- `gray-matter` for Node-side frontmatter generation in scripts
- `yaml` for browser-side frontmatter parsing in the content loader

## Local setup

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run docs:convert
npm run docs:convert -- "Essay Draft.docx"
npm run docs:validate
npm run build
npm run lint
```

## Deployment

This repository is configured for GitHub Pages deployment from GitHub Actions.

- Production URL: `https://newman-james.github.io/academic-portfolio/`
- Deploy workflow: `.github/workflows/deploy.yml`

Every push to `main` rebuilds the site and publishes the contents of `dist/` to GitHub Pages.

## Editorial workflow

1. Save the Word document into `docs/`.
2. Run `npm run docs:convert`.
3. Review the generated Markdown and frontmatter in `content/`.
4. Add or correct metadata.
5. Preview the application locally with `npm run dev`.
6. Change the document `status` to `published` when ready.
7. Run `npm run docs:validate`.
8. Run `npm run build`.

## Canonical and generated files

Canonical files:

- `docs/**/*.docx`

Generated and reviewable files:

- `content/**/*.md`
- `public/documents/**/*`
- `public/document-assets/**/*`

React presentation files:

- `src/components/**/*`
- `src/pages/**/*`
- `src/content/collections.js`

Build and conversion scripts:

- `scripts/convert-docs.mjs`
- `scripts/validate-content.mjs`
- `scripts/lib/content-utils.mjs`

Generated Markdown should be committed.

Reason:

- it is the application’s build-time content source
- it is reviewable and editable before publication
- it records curated frontmatter alongside converted body content

Source `.docx` files should also be committed because they remain canonical.

## Directory structure

```text
.
├── docs/
│   ├── writing/
│   ├── reading/
│   └── drafts/
│       ├── writing/
│       └── reading/
├── content/
│   ├── writing/
│   └── reading/
├── public/
│   ├── documents/
│   └── document-assets/
├── scripts/
│   ├── convert-docs.mjs
│   ├── validate-content.mjs
│   └── lib/
├── src/
│   ├── components/
│   ├── content/
│   ├── data/
│   ├── hooks/
│   ├── pages/
│   ├── styles/
│   ├── theme/
│   └── utils/
├── index.html
└── package.json
```

## Conversion behavior

`npm run docs:convert` does the following:

- scans `docs/` recursively for supported `.docx` files
- detects whether a file belongs to the `writing` or `reading` collection from its path
- creates deterministic Markdown filenames from the source filename slug
- copies the original `.docx` into `public/documents/`
- extracts embedded images into `public/document-assets/<collection>/<slug>/`
- converts the document body into Markdown
- writes or updates `content/<collection>/<slug>.md`
- stores a `sourceChecksum` in frontmatter so unchanged source files can be skipped

The script does not delete generated Markdown or old extracted assets automatically.

## Frontmatter model

Generated writing Markdown uses frontmatter like this:

```yaml
---
id: "writing-example-writing-piece"
slug: "example-writing-piece"
title: "Example title"
subtitle: ""
summary: "TODO: add summary"
subject: "TODO: assign subject"
type: "TODO: assign writing type"
date: ""
readingTime: 8
featured: false
status: "review"
tags: []
sourceDocument: "writing/example-writing-piece.docx"
relatedWriting: []
context: ""
teacherFeedback: ""
reflection: ""
sourceChecksum: "..."
---
```

Writing statuses supported by the app and validation script:

- `draft`
- `review`
- `published`
- `archived`

Only `published` writing appears in the normal public writing index and home page sections.

Reading entries follow the same publication status model, while also supporting a separate `readingStatus` field such as `To read`, `Reading`, `Completed`, or `Revisit`.

## Metadata rules

The conversion script safely infers only a limited set of values:

- slug from the filename
- source document path
- reading time from generated text length
- default status from source location

Where metadata cannot be safely inferred, the script writes explicit placeholders such as `TODO: add summary`.

Curated frontmatter is preserved during reconversion whenever possible.

Specifically:

- manually edited frontmatter fields are kept
- `sourceDocument`, `sourceChecksum`, and inferred reading time are updated from the source file
- document body content is regenerated when the source checksum changes

Important:

- if you manually edit the Markdown body and later reconvert a changed `.docx`, the body will be regenerated from Word
- durable textual corrections should therefore be made in the canonical Word document as well, not only in the generated Markdown

## Markdown rendering

The React application renders Markdown through a dedicated pipeline rather than browser-default prose styles.

Key pieces:

- `src/content/collections.js` discovers Markdown files and parses frontmatter at build time
- `src/components/MarkdownArticle.jsx` maps Markdown elements to semantic React output
- `src/components/ArticleLayout.jsx` and `src/components/ArticleMetadata.jsx` provide the editorial article shell
- `src/styles/main.scss` applies Carbon-token-based long-form styling for headings, paragraphs, quotations, tables, figures, links, code blocks, and footnotes

Supported rendering features:

- standard Markdown
- GitHub-flavoured Markdown
- headings
- paragraphs
- ordered and unordered lists
- block quotations
- links
- images
- tables
- footnotes
- horizontal rules
- inline code and fenced code blocks

Arbitrary executable HTML is not enabled in the renderer.

## Images and extracted assets

Embedded Word document images are extracted during conversion and written to:

- `public/document-assets/<collection>/<slug>/`

Generated Markdown references those assets with stable public paths, for example:

- `/document-assets/writing/example-writing-piece/image-001.png`

The original `.docx` remains unchanged in `docs/`.

## Adding related writing

Add related links in the frontmatter of a writing entry using other writing IDs:

```yaml
relatedWriting:
  - "writing-another-piece"
  - "writing-further-response"
```

The article page resolves those IDs against the discovered writing collection.

## Publishing, archiving, and removal

To publish a writing piece:

1. confirm frontmatter is complete
2. set `status: "published"`
3. run `npm run docs:validate`
4. run `npm run build`

To archive a writing piece safely:

1. keep the `.docx` in `docs/`
2. keep the Markdown file in `content/`
3. set `status: "archived"`

To remove a piece completely:

1. delete the source `.docx` from `docs/`
2. delete the generated Markdown file from `content/`
3. delete the copied source file from `public/documents/`
4. delete any extracted assets from `public/document-assets/`

The conversion script does not remove those generated files for you.

## Troubleshooting

If `npm run docs:convert` fails:

- confirm the file is a real `.docx` file and not a temporary Office lock file
- confirm the document is placed under `docs/writing`, `docs/reading`, or `docs/drafts/<collection>`
- rerun with a filename filter: `npm run docs:convert -- "My Draft.docx"`
- inspect the console output for Mammoth conversion warnings

If `npm run docs:validate` fails:

- check that `sourceDocument` points to a file that still exists under `docs/`
- complete missing metadata for any `published` item
- resolve duplicate `id` or `slug` values

If the app shows no public writing:

- confirm at least one writing Markdown file exists in `content/writing/`
- confirm its frontmatter `status` is `published`

## Notes for later review

- The student name remains a placeholder in `src/data/site.js`.
- Personal biography and contact details remain placeholders on the About page.
- The build still emits Carbon font-resolution warnings from upstream package styles, but the application builds successfully.
