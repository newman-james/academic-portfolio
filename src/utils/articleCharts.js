import { csvParse } from 'd3-dsv'

export function parseArticleChart(csv, config) {
  if (!config || !['line', 'bar'].includes(config.type) ||
      ![config.x, config.y, config.yLabel].every(value => typeof value === 'string' && value.trim()) ||
      (config.series !== undefined && (typeof config.series !== 'string' || !config.series.trim())) ||
      (config.orientation !== undefined &&
        (!['horizontal', 'vertical'].includes(config.orientation) || config.type !== 'bar')) ||
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

export function toCarbonChartData(rows, config) {
  return rows.map(row => ({
    group: row.series || config.yLabel,
    category: chartXLabel(row.x, config.xFormat),
    value: row.y,
  }))
}

export function carbonChartOptions(config, caption, theme, rows, downloadSource) {
  const horizontal = config.type === 'bar' && config.orientation !== 'vertical'
  const categoryAxis = { mapsTo: 'category', scaleType: 'labels' }
  const valueAxis = { mapsTo: 'value', scaleType: 'linear', includeZero: true, title: config.yLabel }
  const categoryCount = new Set(rows.map(row => row.x)).size
  return {
    accessibility: { svgAriaLabel: caption },
    title: caption,
    theme,
    height: horizontal ? `${Math.max(400, categoryCount * 38 + 120)}px` : '400px',
    axes: horizontal
      ? { left: categoryAxis, bottom: valueAxis }
      : { left: valueAxis, bottom: categoryAxis },
    legend: { enabled: Boolean(config.series), clickable: true, truncation: { type: 'none' } },
    toolbar: {
      enabled: true,
      numberOfIcons: 3,
      controls: [
        { type: 'Show as data-table' },
        { type: 'Make fullscreen' },
        { type: 'Custom', id: 'toolbar-original-dataset', title: 'Download original dataset (CSV)', text: 'Download original dataset (CSV)', clickFunction: downloadSource },
        { type: 'Export as CSV', text: 'Export plotted data (CSV)' },
        { type: 'Export as PNG' },
        { type: 'Export as JPG' },
      ],
    },
    tabularRepModal: {
      tableHeadingFormatter: () => [config.series || 'Series', config.x, config.yLabel],
    },
    locale: {
      translations: {
        toolbar: { exportAsCSV: 'Export plotted data (CSV)' },
        tabularRep: { downloadAsCSV: 'Download plotted data (CSV)' },
      },
    },
    animations: false,
  }
}
