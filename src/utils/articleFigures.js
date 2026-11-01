function textContent(node) {
  return node.type === 'text' ? node.value : (node.children || []).map(textContent).join('')
}

function stripPrefix(nodes, count) {
  const result = []
  for (const node of nodes) {
    if (count === 0) {
      result.push(node)
    } else if (node.type === 'text') {
      const length = Math.min(count, node.value.length)
      count -= length
      if (length < node.value.length) result.push({ ...node, value: node.value.slice(length) })
    } else if (node.children) {
      const stripped = stripPrefix(node.children, count)
      count = stripped.count
      if (stripped.nodes.length) result.push({ ...node, children: stripped.nodes })
    } else {
      result.push(node)
    }
  }
  return { nodes: result, count }
}

function parseCaption(text) {
  return /^Figure\s+(\d+)(?:\.\s*|\s+|(?=[A-Za-z]))/.exec(text)
}

export function rehypeArticleFigures() {
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
          const match = caption?.tagName === 'p' && parseCaption(textContent(caption))
          node.tagName = 'figure'
          node.properties = { className: ['article-figure'] }
          if (match) {
            node.properties.dataFigureNumber = match[1]
            const remainder = stripPrefix(caption.children, match[0].length).nodes
            node.children.push({
              ...caption,
              tagName: 'figcaption',
              children: [
                { type: 'element', tagName: 'strong', properties: {}, children: [{ type: 'text', value: `Figure ${match[1]}.` }] },
                { type: 'text', value: ' ' },
                ...remainder,
              ],
            })
            parent.children.splice(index + 1, nextIndex - index)
          }
        }
        visit(node)
      }
    }
    visit(tree)
  }
}

export function validateFigureDatasets(markdown, datasets) {
  if (!datasets || typeof datasets !== 'object' || Array.isArray(datasets) || !Object.keys(datasets).length) {
    throw new Error('Figure datasets must be a non-empty mapping.')
  }
  const captions = new Map()
  for (const match of markdown.matchAll(/!\[[^\]]*\]\([^\n)]+\)[ \t]*\r?\n[ \t]*\r?\n([^\r\n]+)/g)) {
    const text = match[1].replace(/\*\*|__/g, '')
    const label = parseCaption(text)
    if (!label) continue
    const number = label[1]
    if (captions.has(number)) throw new Error(`Figure ${number} is duplicated.`)
    captions.set(number, text.slice(label[0].length).trim())
  }
  for (const [number, dataset] of Object.entries(datasets)) {
    if (!/^[1-9]\d*$/.test(number) || !dataset || typeof dataset !== 'object' ||
        typeof dataset.caption !== 'string' || !dataset.caption.trim() ||
        typeof dataset.file !== 'string' || !/^[a-zA-Z0-9_-]+\.csv$/.test(dataset.file)) {
      throw new Error(`Figure ${number} must specify a caption and a CSV filename.`)
    }
    if (!captions.get(number)?.startsWith(dataset.caption)) {
      throw new Error(`Figure ${number} caption does not match its dataset mapping; review the mapping.`)
    }
  }
}
