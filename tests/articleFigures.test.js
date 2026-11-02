import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { rehypeArticleFigures, rehypeRemoveMappedDatasetLinks, validateFigureDatasets } from '../src/utils/articleFigures.js'
import { parseMarkdownFile } from '../scripts/lib/content-utils.mjs'

const text = (value) => ({ type: 'text', value })
const element = (tagName, children = []) => ({ type: 'element', tagName, properties: {}, children })

test('removes only mapped inline dataset links without leaving duplicate punctuation', () => {
  const mapped = element('a', [text('Download dataset (CSV)')])
  mapped.properties.href = '/datasets/chart.csv'
  const other = element('a', [text('Other')])
  other.properties.href = '/datasets/other.csv'
  const reference = element('a', [text('Source dataset')])
  reference.properties.href = '/datasets/chart.csv'
  const tree = { type: 'root', children: [element('p', [text('Source. '), mapped, text('. '), other, text(' '), reference])] }
  rehypeRemoveMappedDatasetLinks({ 1: { file: 'chart.csv' } })(tree)
  assert.equal(tree.children[0].children.map(node => node.value ?? node.children[0].value).join(''), 'Source. Other Source dataset')
  assert.equal(tree.children[0].children.at(-1), reference)
})

test('normalises figure labels and keeps caption formatting', () => {
  for (const children of [
    [text('Figure 1Comparative '), element('em', [text('housing')])],
    [element('strong', [text('Figure 1.')]), text(' Comparative '), element('em', [text('housing')])],
    [text('Figure 1 Comparative '), element('em', [text('housing')])],
  ]) {
    const tree = { type: 'root', children: [element('p', [element('img')]), text('\n'), element('p', children)] }
    rehypeArticleFigures()(tree)
    const figure = tree.children[0]
    assert.equal(figure.tagName, 'figure')
    assert.equal(figure.properties.dataFigureNumber, '1')
    const caption = figure.children[1]
    assert.equal(caption.tagName, 'figcaption')
    assert.equal(caption.children[0].tagName, 'strong')
    assert.equal(caption.children[0].children[0].value, 'Figure 1.')
    assert.equal(caption.children[1].value, ' ')
    assert.equal(caption.children[2].value, 'Comparative ')
    assert.equal(caption.children[3].tagName, 'em')
  }
})

test('does not consume unrelated text after an image', () => {
  const tree = { type: 'root', children: [element('p', [element('img')]), text('\n'), element('p', [text('Not a caption')])] }
  rehypeArticleFigures()(tree)
  assert.equal(tree.children.length, 3)
  assert.equal(tree.children[0].children.length, 1)
  assert.equal(tree.children[2].children[0].value, 'Not a caption')
})

test('recognises and numbers images wrapped in emphasis', () => {
  const image = element('img')
  const tree = {
    type: 'root',
    children: [
      element('p', [element('em', [image])]),
      text('\n'),
      element('p', [text('Figure 1. Emphasised image')]),
    ],
  }

  rehypeArticleFigures()(tree)

  assert.equal(tree.children[0].tagName, 'figure')
  assert.equal(image.properties.dataFigureNumber, '1')
  assert.equal(tree.children[0].children[1].tagName, 'figcaption')
})

test('mapped charts use the full figure title and retain their marked description', () => {
  const image = element('img')
  const description = element('p', [element('em', [text('Source: Original data.')])])
  const prose = element('p', [text('The next paragraph is essay prose.')])
  const tree = {
    type: 'root',
    children: [
      element('p', [image]), text('\n'),
      element('p', [text('Figure 1. Chart title, 2010–2026.')]), text('\n'),
      description, text('\n'), prose,
    ],
  }
  rehypeArticleFigures({ 1: { description: 'Source: Original data.' } })(tree)
  const figure = tree.children[0]
  assert.equal(image.properties.dataFigureTitle, 'Figure 1. Chart title, 2010–2026.')
  assert.equal(figure.children.length, 2)
  assert.equal(figure.children[1].tagName, 'figcaption')
  assert.deepEqual(figure.children[1].properties.className, ['article-figure__description'])
  assert.equal(figure.children[1].children[0].tagName, 'em')
  assert.equal(tree.children.at(-1), prose)
})

test('mapped figures without a description leave subsequent prose unchanged', () => {
  const image = element('img')
  const prose = element('p', [text('Next paragraph.')])
  const tree = { type: 'root', children: [element('p', [image]), text('\n'), element('p', [text('Figure 1. Chart.')]), text('\n'), prose] }
  rehypeArticleFigures({ 1: {} })(tree)
  assert.equal(tree.children[0].children.length, 1)
  assert.equal(tree.children.at(-1), prose)
  assert.throws(() => rehypeArticleFigures({ 1: { description: 'Source:' } })({
    type: 'root',
    children: [element('p', [element('img')]), text('\n'), element('p', [text('Figure 1. Chart.')]), text('\n'), prose],
  }), /description does not match/)
})

test('validates dataset mapping against figure number and caption', async () => {
  const entry = parseMarkdownFile(await readFile(new URL('../content/writing/the-political-economy-of-hong-kong-s-housing-crisis.md', import.meta.url), 'utf8'))
  assert.doesNotThrow(() => validateFigureDatasets(entry.content, entry.data.figureDatasets))
  assert.doesNotThrow(() => validateFigureDatasets(
    '_![Chart](chart.png)_\n\nFigure 1. Chart',
    { 1: { caption: 'Chart', file: 'chart.csv' } },
  ))
  assert.throws(() => validateFigureDatasets(entry.content, { 1: { ...entry.data.figureDatasets[1], caption: 'Wrong chart' } }), /caption does not match/)
  assert.throws(() => validateFigureDatasets(entry.content, { 1: { ...entry.data.figureDatasets[1], file: '../other.csv' } }), /CSV filename/)
  assert.throws(() => validateFigureDatasets(entry.content, { 3: entry.data.figureDatasets[1] }), /caption does not match/)
  assert.throws(() => validateFigureDatasets(entry.content, { 1: { ...entry.data.figureDatasets[1], description: 'Source:' } }), /description does not match/)
  assert.throws(() => validateFigureDatasets(`${entry.content}\n\n![x](image.png)\n\nFigure 1. Duplicate\n`, entry.data.figureDatasets), /duplicated/)
})

test('the EV article maps both charts to the supplied datasets', async () => {
  const file = '../content/writing/european-industrial-policy-and-the-economic-consequences-of-chinese-ev-competition.md'
  const entry = parseMarkdownFile(await readFile(new URL(file, import.meta.url), 'utf8'))
  assert.doesNotThrow(() => validateFigureDatasets(entry.content, entry.data.figureDatasets))
  assert.equal(entry.data.figureDatasets[1].file, 'figure1_eu_battery_electric_imports_china_share_2021_2025_rawgraphs.csv')
  assert.equal(entry.data.figureDatasets[2].file, 'figure2_china_manufactured_bev_share_selected_eu_2024h1_rawgraphs.csv')
})
