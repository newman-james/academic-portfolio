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

function assetUrl(src) {
  return src?.startsWith('/document-assets/') || src?.startsWith('/datasets/')
    ? `${import.meta.env.BASE_URL}${src.slice(1)}`
    : src
}

function rehypeArticleFigures() {
  return (tree) => {
    function visit(parent) {
      if (!parent.children) return

      for (let index = 0; index < parent.children.length; index += 1) {
        const node = parent.children[index]
        if (node.tagName === 'p' && node.children.some((child) => child.tagName === 'img')) {
          let nextIndex = index + 1
          while (parent.children[nextIndex]?.type === 'text' && !parent.children[nextIndex].value.trim()) {
            nextIndex += 1
          }
          const caption = parent.children[nextIndex]
          const captionText = caption?.children?.map((child) => child.value || child.children?.map((part) => part.value || '').join('') || '').join('') || ''
          node.tagName = 'figure'
          node.properties = { className: ['article-figure'] }
          if (caption?.tagName === 'p' && /^Figure \d+\./.test(captionText)) {
            node.children.push({ ...caption, tagName: 'figcaption' })
            parent.children.splice(index + 1, nextIndex - index)
          }
        }
        visit(node)
      }
    }
    visit(tree)
  }
}

function MarkdownArticle({ content, className = 'article-body' }) {
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
          figure: ({ children }) => (
            <figure className="article-figure">
              {children}
            </figure>
          ),
          img: ({ alt, src, title }) => (
            <div className="article-image-scroll" tabIndex={0} role="region" aria-label="Article illustration; scroll horizontally if needed">
              <img alt={alt || ''} src={assetUrl(src)} title={title} />
            </div>
          ),
          table: ({ children }) => (
            <div className="article-table-scroll" tabIndex={0} role="region" aria-label="Article data table; scroll horizontally if needed">
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