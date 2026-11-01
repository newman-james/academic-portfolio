function escapeAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function formatReferenceCitations(content, citations) {
  if (citations === undefined) return content
  if (!citations || typeof citations !== 'object' || Array.isArray(citations) || !Object.keys(citations).length) {
    throw new Error('Reference citations must be a non-empty mapping of Word footnotes to reference prefixes.')
  }

  const sections = content.split(/\n## References\s*\n/)
  if (sections.length !== 2) throw new Error('Expected exactly one References section for reference citations.')
  const [body, referenceSection] = sections
  const noteStart = referenceSection.search(/^\[\^\d+\]:/m)
  if (noteStart < 0) throw new Error('Reference citations require Word footnote definitions.')
  const references = referenceSection.slice(0, noteStart).trim().split(/\n\s*\n/)
  const notesText = referenceSection.slice(noteStart).trim()
  const notePattern = /^\[\^(\d+)\]:[ \t]*(.*(?:\n {4}[^\n]*)*)/gm
  const noteEntries = Array.from(notesText.matchAll(notePattern), (match) => [match[1], match[2]])
  const notes = new Map(noteEntries)
  if (!references.length || notesText.replace(notePattern, '').trim() || notes.size !== noteEntries.length || notes.size !== Object.keys(citations).length) {
    throw new Error('Footnote definitions do not match the reference citation mapping.')
  }

  const orderedReferences = []
  const usedNotes = new Set()
  const renderedBody = body.replace(/\[\^(\d+)\]/g, (_, noteId) => {
    const mapping = citations[noteId]
    const note = notes.get(noteId)
    if (!mapping || typeof mapping.reference !== 'string' || !mapping.reference.trim() || typeof mapping.note !== 'string' || !note) {
      throw new Error(`Missing reference citation mapping or footnote for ${noteId}.`)
    }
    if (note.replace(/\s+/g, ' ').trim() !== mapping.note.replace(/\s+/g, ' ').trim()) {
      throw new Error(`Footnote ${noteId} has changed; review its reference citation mapping.`)
    }
    const matches = references.filter((reference) => reference.startsWith(mapping.reference))
    if (matches.length !== 1) throw new Error(`Reference prefix for footnote ${noteId} must match exactly one reference.`)
    let index = orderedReferences.indexOf(matches[0])
    if (index === -1) index = orderedReferences.push(matches[0]) - 1
    usedNotes.add(noteId)
    const number = index + 1
    const description = note.replace(/[_*`]/g, '').replace(/\s+/g, ' ').trim()
    return `<sup><a href="#reference-${number}" aria-label="${escapeAttribute(`Reference ${number}, ${description}`)}">${number}</a></sup>`
  })

  if (usedNotes.size !== notes.size || Object.keys(citations).some((key) => !usedNotes.has(key))) {
    throw new Error('Every mapped footnote must have an in-text citation.')
  }
  for (const reference of references) {
    if (!orderedReferences.includes(reference)) orderedReferences.push(reference)
  }
  const renderedReferences = orderedReferences.map((reference, index) =>
    `<span id="reference-${index + 1}"></span>${index + 1}. ${reference}`,
  )
  return `${renderedBody.trimEnd()}\n\n## References\n\n${renderedReferences.join('\n\n')}`
}
