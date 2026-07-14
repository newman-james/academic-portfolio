const rawAboutSections = import.meta.glob('../../content/about/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
})

function extractTitle(markdown, pathname) {
  const headingMatch = String(markdown).match(/^#\s+(.+)$/m)

  if (headingMatch) {
    return headingMatch[1].trim()
  }

  return pathname
    .split('/')
    .pop()
    .replace(/\.md$/, '')
    .replace(/^\d+-/, '')
    .replace(/-/g, ' ')
}

function sortByPathname([leftPathname], [rightPathname]) {
  return leftPathname.localeCompare(rightPathname)
}

export const aboutSections = Object.entries(rawAboutSections)
  .sort(sortByPathname)
  .map(([pathname, raw]) => ({
    content: String(raw).trim(),
    id: pathname.split('/').pop().replace(/\.md$/, ''),
    title: extractTitle(raw, pathname),
  }))