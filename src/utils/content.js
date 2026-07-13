export function formatDate(dateString) {
  if (!dateString) {
    return 'Undated'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString))
}

export function formatReadingTime(minutes) {
  return `${minutes} min read`
}

export function sortByDateDescending(items) {
  return [...items].sort((left, right) => {
    if (!left.date && !right.date) {
      return left.title.localeCompare(right.title)
    }

    if (!left.date) {
      return 1
    }

    if (!right.date) {
      return -1
    }

    return new Date(right.date) - new Date(left.date)
  })
}

export function sortByCompletionDateDescending(items) {
  return [...items].sort((left, right) => {
    if (!left.dateCompleted && !right.dateCompleted) {
      return left.title.localeCompare(right.title)
    }

    if (!left.dateCompleted) {
      return 1
    }

    if (!right.dateCompleted) {
      return -1
    }

    return new Date(right.dateCompleted) - new Date(left.dateCompleted)
  })
}

export function getFilterOptions(values, allLabel) {
  return [{ id: slugify(allLabel), label: allLabel }, ...values.map((value) => ({ id: slugify(value), label: value }))]
}

export function matchesFilter(value, selectedValue, allLabel) {
  return selectedValue === allLabel || value === selectedValue
}

export function getDisplaySummary(entry) {
  const summary = String(entry.summary || '').trim()

  if (!summary || summary.startsWith('TODO:')) {
    return entry.excerpt || ''
  }

  return summary
}

export function truncateToWordCount(text, wordLimit) {
  const words = String(text).trim().split(/\s+/).filter(Boolean)

  if (!wordLimit || words.length <= wordLimit) {
    return words.join(' ')
  }

  return `${words.slice(0, wordLimit).join(' ')}...`
}

export function formatStatusLabel(status) {
  if (!status) {
    return ''
  }

  return String(status).charAt(0).toUpperCase() + String(status).slice(1)
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}