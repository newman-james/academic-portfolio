import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parseMarkdownFile } from '../scripts/lib/content-utils.mjs'
import { carbonChartOptions, chartXLabel, parseArticleChart, toCarbonChartData } from '../src/utils/articleCharts.js'

test('all seven article figures retain their original chart types and orientations', async () => {
  const articles = [
    ['singapore-exchange-rate-policy.md', [26], [['line', undefined]]],
    ['the-political-economy-of-hong-kong-s-housing-crisis.md', [28, 28], [['line', undefined], ['line', undefined]]],
    ['european-industrial-policy-and-the-economic-consequences-of-chinese-ev-competition.md', [10, 12], [['line', undefined], ['bar', 'horizontal']]],
    ['financing-britain-s-future-6.md', [17, 18], [['bar', 'vertical'], ['bar', 'vertical']]],
  ]
  for (const [file, counts, chartStyles] of articles) {
    const entry = parseMarkdownFile(await readFile(new URL(`../content/writing/${file}`, import.meta.url), 'utf8'))
    assert.equal(Object.keys(entry.data.figureDatasets).length, counts.length)
    for (const [index, dataset] of Object.values(entry.data.figureDatasets).entries()) {
      assert.deepEqual([dataset.chart.type, dataset.chart.orientation], chartStyles[index], `${file}: figure ${index + 1}`)
      const csv = await readFile(new URL(`../public/datasets/${dataset.file}`, import.meta.url), 'utf8')
      const rows = parseArticleChart(csv, dataset.chart)
      assert.equal(rows.length, counts[index], `${file}: ${dataset.file}`)
      assert.ok(rows.every(row => Number.isFinite(row.y)))
      const data = toCarbonChartData(rows, dataset.chart)
      assert.deepEqual(data.map(row => row.value), rows.map(row => row.y))
      assert.deepEqual(data.map(row => row.group), rows.map(row => row.series || dataset.chart.yLabel))
      const options = carbonChartOptions(dataset.chart, dataset.caption, 'g100', rows)
      const horizontal = dataset.chart.type === 'bar' && dataset.chart.orientation !== 'vertical'
      assert.equal(options.axes[horizontal ? 'left' : 'bottom'].mapsTo, 'category')
      assert.equal(options.axes[horizontal ? 'bottom' : 'left'].mapsTo, 'value')
      assert.equal(options.theme, 'g100')
    }
  }
})

test('Carbon chart data retains formatted labels and separate series', () => {
  const rows = [
    { x: '01/09/2025', series: 'Headline', y: 0.7 },
    { x: '01/09/2025', series: 'Core', y: 0.4 },
  ]
  assert.deepEqual(toCarbonChartData(rows, { xFormat: 'month', yLabel: 'Inflation' }), [
    { category: 'Sep 25', group: 'Headline', value: 0.7 },
    { category: 'Sep 25', group: 'Core', value: 0.4 },
  ])
})

test('Carbon toolbar provides tables, fullscreen, source data and chart exports', () => {
  const config = { type: 'bar', orientation: 'vertical', x: 'Year', y: 'Value', yLabel: 'Value' }
  const downloadSource = () => {}
  const options = carbonChartOptions(config, 'Figure 1', 'g100', [{ x: '2020', y: 1 }], downloadSource)
  assert.equal(options.toolbar.enabled, true)
  assert.deepEqual(options.toolbar.controls.map(control => control.type), [
    'Show as data-table', 'Make fullscreen', 'Custom', 'Export as CSV', 'Export as PNG', 'Export as JPG',
  ])
  assert.equal(options.toolbar.controls[2].clickFunction, downloadSource)
  assert.deepEqual(options.tabularRepModal.tableHeadingFormatter(), ['Series', 'Year', 'Value'])
})

test('retains exact dataset values and statuses, including reconstructed figures', async () => {
  const entry = parseMarkdownFile(await readFile(new URL('../content/writing/european-industrial-policy-and-the-economic-consequences-of-chinese-ev-competition.md', import.meta.url), 'utf8'))
  const dataset = entry.data.figureDatasets[1]
  const rows = parseArticleChart(await readFile(new URL(`../public/datasets/${dataset.file}`, import.meta.url), 'utf8'), dataset.chart)
  assert.deepEqual(rows[0], { x: '2021', series: 'China', y: 30, status: 'Approximate / reconstructed' })
  assert.deepEqual(rows.at(-2), { x: '2025', series: 'China', y: 42, status: 'Published Eurostat share' })
})

test('rejects missing columns, invalid values and duplicate observations', () => {
  const config = { type: 'line', x: 'Year', y: 'Value', series: 'Series', yLabel: 'Value' }
  assert.throws(() => parseArticleChart('Year,Value\n2020,1', config), /missing a configured column/)
  assert.throws(() => parseArticleChart('Year,Value,Series\n2020,,A', config), /Invalid chart value/)
  assert.throws(() => parseArticleChart('Year,Value,Series\n2020,-1,A', config), /Invalid chart value/)
  assert.throws(() => parseArticleChart('Year,Value,Series\n2020,1,A\n2020,2,A', config), /Duplicate chart observation/)
  assert.throws(() => parseArticleChart('', {}), /Chart configuration/)
  assert.throws(() => parseArticleChart('Year,Value\n2020,1', { type: 'bar', orientation: 'diagonal', x: 'Year', y: 'Value', yLabel: 'Value' }), /Chart configuration/)
  assert.throws(() => parseArticleChart('Year,Value\n2020,1', { type: 'line', orientation: 'vertical', x: 'Year', y: 'Value', yLabel: 'Value' }), /Chart configuration/)
  assert.equal(chartXLabel('01/09/2025', 'month'), 'Sep 25')
})

test('supports single-series line charts without a series column', () => {
  const rows = parseArticleChart(
    'Year,Value\n2020,3\n2021,2',
    { type: 'line', x: 'Year', y: 'Value', yLabel: 'Value' },
  )

  assert.deepEqual(rows, [
    { x: '2020', series: '', y: 3, status: '' },
    { x: '2021', series: '', y: 2, status: '' },
  ])
})
