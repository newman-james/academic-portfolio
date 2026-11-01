import { csvParse } from 'd3-dsv'

export function parseArticleChart(csv, config) {
  if (!config || !['line', 'bar'].includes(config.type) ||
      ![config.x, config.y, config.yLabel].every(value => typeof value === 'string' && value.trim()) ||
      (config.series !== undefined && (typeof config.series !== 'string' || !config.series.trim())) ||
      (config.xFormat !== undefined && config.xFormat !== 'month') ||
      (config.status !== undefined && (typeof config.status !== 'string' || !config.status.trim()))) {
    throw new Error('Chart configuration must specify a supported type, columns and axis label.')
  }
  const rows = csvParse(csv.replace(/^\uFEFF/, ''))
  const columns = [config.x, config.y, config.series, config.status].filter(Boolean)
  if (!rows.length || columns.some(column => !rows.columns.includes(column))) {
    throw new Error('Chart CSV is empty or is missing a configured column.')
  }
  const seen = new Set()
  return rows.map((row, index) => {
    const x = row[config.x]?.trim()
    const series = config.series ? row[config.series]?.trim() : ''
    const value = row[config.y]?.trim()
    const y = Number(value)
    if (!x || (config.series && !series) || !value || !Number.isFinite(y) || y < 0 ||
        (config.xFormat === 'month' && !/^01\/(0[1-9]|1[0-2])\/\d{4}$/.test(x))) {
      throw new Error(`Invalid chart value on CSV row ${index + 2}.`)
    }
    const key = JSON.stringify([x, series])
    if (seen.has(key)) throw new Error(`Duplicate chart observation on CSV row ${index + 2}.`)
    seen.add(key)
    return { x, series, y, status: config.status ? row[config.status]?.trim() : '' }
  })
}

export function chartXLabel(value, format) {
  if (format !== 'month') return value
  const [, month, year] = value.split('/')
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month) - 1]} ${year.slice(2)}`
}
