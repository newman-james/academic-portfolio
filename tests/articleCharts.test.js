import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parseMarkdownFile } from '../scripts/lib/content-utils.mjs'
import { chartXLabel, parseArticleChart } from '../src/utils/articleCharts.js'

test('all seven article figures plot their matching datasets', async () => {
  const articles = [
    ['singapore-exchange-rate-policy.md', [26]],
    ['the-political-economy-of-hong-kong-s-housing-crisis.md', [28, 28]],
    ['european-industrial-policy-and-the-economic-consequences-of-chinese-ev-competition.md', [10, 12]],
    ['financing-britain-s-future-6.md', [17, 18]],
  ]
  for (const [file, counts] of articles) {
    const entry = parseMarkdownFile(await readFile(new URL(`../content/writing/${file}`, import.meta.url), 'utf8'))
    assert.equal(Object.keys(entry.data.figureDatasets).length, counts.length)
    for (const [index, dataset] of Object.values(entry.data.figureDatasets).entries()) {
      const csv = await readFile(new URL(`../public/datasets/${dataset.file}`, import.meta.url), 'utf8')
      const rows = parseArticleChart(csv, dataset.chart)
      assert.equal(rows.length, counts[index], `${file}: ${dataset.file}`)
      assert.ok(rows.every(row => Number.isFinite(row.y)))
    }
  }
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
