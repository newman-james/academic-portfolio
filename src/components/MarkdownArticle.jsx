import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

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

function MarkdownArticle({ content, className = 'article-body' }) {
  return (
    <div className={className}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const isExternal = /^https?:\/\//.test(href || '')

            return (
              <a
                href={href}
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
          img: ({ alt, src, title }) => (
            <figure className="article-figure">
              <img alt={alt || ''} loading="lazy" src={src} />
              {title ? <figcaption>{title}</figcaption> : null}
            </figure>
          ),
          table: ({ children }) => (
            <div className="article-table-scroll">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownArticle