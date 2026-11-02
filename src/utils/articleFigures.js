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

function containsImage(node) {
  return node.tagName === 'img' || node.children?.some(containsImage)
}

function assignFigureNumber(node, number, title) {
  if (node.tagName === 'img') {
    node.properties.dataFigureNumber = number
    node.properties.dataFigureTitle = title
    return
  }
  node.children?.forEach(child => assignFigureNumber(child, number, title))
}

export function rehypeRemoveMappedDatasetLinks(datasets) {
  const mappedPaths = new Set(Object.values(datasets || {}).map(dataset => `/datasets/${dataset.file}`))
  return (tree) => {
    function visit(node) {
      if (!node.children) return
      for (let index = 0; index < node.children.length; index += 1) {
        const child = node.children[index]
        if (child.tagName === 'a' && mappedPaths.has(child.properties?.href) &&
            /^download dataset\s*\(csv\)$/i.test(textContent(child).trim())) {
          const previous = node.children[index - 1]
          const next = node.children[index + 1]
          if (previous?.type === 'text' && next?.type === 'text' && /[.!?]\s*$/.test(previous.value)) {
            previous.value = previous.value.trimEnd()
            next.value = next.value.replace(/^\s*\.(?=\s|$)/, '')
          }
          node.children.splice(index, 1)
          index -= 1
        } else {
          visit(child)
        }
      }
    }
    visit(tree)
  }
}

export function rehypeArticleFigures(datasets) {
  return (tree) => {
    function visit(parent) {
      if (!parent.children) return

      for (let index = 0; index < parent.children.length; index += 1) {
        const node = parent.children[index]
        if (node.tagName === 'p' && node.children.some(containsImage)) {
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
            const title = `Figure ${match[1]}. ${textContent(caption).slice(match[0].length).trim()}`
            node.children.forEach(child => assignFigureNumber(child, match[1], title))
            const remainder = stripPrefix(caption.children, match[0].length).nodes
            if (!datasets?.[match[1]]) {
              node.children.push({
                ...caption,
                tagName: 'figcaption',
                children: [
                  { type: 'element', tagName: 'strong', properties: {}, children: [{ type: 'text', value: `Figure ${match[1]}.` }] },
                  { type: 'text', value: ' ' },
                  ...remainder,
                ],
              })
            }
            parent.children.splice(index + 1, nextIndex - index)
            const descriptionPrefix = datasets?.[match[1]]?.description
            if (descriptionPrefix) {
              let descriptionIndex = index + 1
              while (parent.children[descriptionIndex]?.type === 'text' && !parent.children[descriptionIndex].value.trim()) {
                descriptionIndex += 1
              }
              const description = parent.children[descriptionIndex]
              if (description?.tagName !== 'p' || !textContent(description).trim().startsWith(descriptionPrefix)) {
                throw new Error(`Figure ${match[1]} description does not match its dataset mapping.`)
              }
              node.children.push({
                ...description,
                tagName: 'figcaption',
                properties: { className: ['article-figure__description'] },
              })
              parent.children.splice(index + 1, descriptionIndex - index)
            }
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
  for (const match of markdown.matchAll(/!\[[^\]]*\]\([^\n)]+\)[_*]?[ \t]*\r?\n[ \t]*\r?\n([^\r\n]+)/g)) {
    const text = match[1].replace(/\*\*|__/g, '')
    const label = parseCaption(text)
    if (!label) continue
    const number = label[1]
    if (captions.has(number)) throw new Error(`Figure ${number} is duplicated.`)
    const following = markdown.slice(match.index + match[0].length).match(/^\r?\n[ \t]*\r?\n([^\r\n]+)/)
    const description = following?.[1].replace(/<[^>]*>/g, '').replace(/[*_]/g, '').trim()
    captions.set(number, { caption: text.slice(label[0].length).trim(), description })
  }
  for (const [number, dataset] of Object.entries(datasets)) {
    if (!/^[1-9]\d*$/.test(number) || !dataset || typeof dataset !== 'object' ||
        typeof dataset.caption !== 'string' || !dataset.caption.trim() ||
        typeof dataset.file !== 'string' || !/^[a-zA-Z0-9_-]+\.csv$/.test(dataset.file)) {
      throw new Error(`Figure ${number} must specify a caption and a CSV filename.`)
    }
    if (!captions.get(number)?.caption.startsWith(dataset.caption)) {
      throw new Error(`Figure ${number} caption does not match its dataset mapping; review the mapping.`)
    }
    if (dataset.description !== undefined &&
        (typeof dataset.description !== 'string' || !dataset.description.trim() ||
          !captions.get(number)?.description?.startsWith(dataset.description))) {
      throw new Error(`Figure ${number} description does not match its dataset mapping; review the mapping.`)
    }
  }
}
