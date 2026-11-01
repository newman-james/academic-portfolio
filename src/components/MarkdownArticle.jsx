import { Button } from '@carbon/react'
import { Maximize, Minimize } from '@carbon/icons-react'
import { useId, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { formatReferenceCitations } from '../utils/referenceCitations.js'
import { rehypeArticleFigures } from '../utils/articleFigures.js'

function flattenChildren(children) {
  return Array.isArray(children)
    ? children.map((child) => flattenChildren(child?.props?.children ?? child)).join('')
    : typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : ''
}

function headingId(children) {
  return flattenChildren(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function assetUrl(src) {
  return src?.startsWith('/document-assets/') || src?.startsWith('/datasets/')
    ? `${import.meta.env.BASE_URL}${src.slice(1)}`
    : src
}

function ArticleImage({ alt, src, title }) {
  const dialogRef = useRef(null)
  const expandRef = useRef(null)
  const dialogId = useId()

  return (
    <div className="article-image-viewer">
      <img alt={alt || ''} src={assetUrl(src)} title={title} />
      <Button
        ref={expandRef}
        className="article-image-expand no-print"
        kind="ghost"
        size="sm"
        renderIcon={Maximize}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={() => dialogRef.current.showModal()}
      >
        View chart fullscreen
      </Button>
      <dialog ref={dialogRef} id={dialogId} className="article-image-dialog no-print" aria-label="Fullscreen chart" onClose={() => expandRef.current?.focus()}>
        <form method="dialog">
          <Button type="submit" kind="tertiary" size="sm" renderIcon={Minimize} autoFocus>
            Close fullscreen chart
          </Button>
        </form>
        <div className="article-image-dialog-content">
          <img alt={alt || ''} src={assetUrl(src)} title={title} />
        </div>
      </dialog>
    </div>
  )
}

function MarkdownArticle({ content, className = 'article-body', referenceCitations, figureDatasets }) {
  return (
    <div className={className}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeArticleFigures]}
        remarkPlugins={[remarkGfm]}
        remarkRehypeOptions={{ footnoteLabel: 'Notes', footnoteBackLabel: 'Back to citation' }}
        components={{
          a: ({ href, children, ...props }) => {
            const isExternal = /^https?:\/\//.test(href || '')

            return (
              <a
                href={assetUrl(href)}
                download={href?.startsWith('/datasets/') ? href.split('/').pop() : undefined}
                rel={isExternal ? 'noreferrer noopener' : undefined}
                target={isExternal ? '_blank' : undefined}
                {...props}
              >
                {children}
              </a>
            )
          },
          h1: ({ children, ...props }) => <h2 id={headingId(children)} {...props}>{children}</h2>,
          h2: ({ children, ...props }) => <h2 id={headingId(children)} {...props}>{children}</h2>,
          h3: ({ children, ...props }) => <h3 id={headingId(children)} {...props}>{children}</h3>,
          h4: ({ children, ...props }) => <h4 id={headingId(children)} {...props}>{children}</h4>,
          figure: ({ children, node }) => (
            <figure className="article-figure">
              {children}
              {figureDatasets?.[node.properties.dataFigureNumber] ? (
                <div className="article-figure__dataset">
                  <a
                    href={assetUrl(`/datasets/${figureDatasets[node.properties.dataFigureNumber].file}`)}
                    download={figureDatasets[node.properties.dataFigureNumber].file}
                    aria-label={`Download Figure ${node.properties.dataFigureNumber} dataset (CSV)`}
                  >
                    Download dataset (CSV)
                  </a>
                </div>
              ) : null}
            </figure>
          ),
          img: ({ alt, src, title }) => <ArticleImage alt={alt} src={src} title={title} />,
          table: ({ children }) => (
            <div className="article-table-scroll" tabIndex={0} role="region" aria-label="Article data table; scroll horizontally if needed">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {formatReferenceCitations(content, referenceCitations)}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownArticle