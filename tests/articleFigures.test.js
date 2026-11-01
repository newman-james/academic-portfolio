import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { rehypeArticleFigures, validateFigureDatasets } from '../src/utils/articleFigures.js'
import { parseMarkdownFile } from '../scripts/lib/content-utils.mjs'

const text = (value) => ({ type: 'text', value })
const element = (tagName, children = []) => ({ type: 'element', tagName, properties: {}, children })

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

test('validates dataset mapping against figure number and caption', async () => {
  const entry = parseMarkdownFile(await readFile(new URL('../content/writing/the-political-economy-of-hong-kong-s-housing-crisis.md', import.meta.url), 'utf8'))
  assert.doesNotThrow(() => validateFigureDatasets(entry.content, entry.data.figureDatasets))
  assert.throws(() => validateFigureDatasets(entry.content, { 1: { ...entry.data.figureDatasets[1], caption: 'Wrong chart' } }), /caption does not match/)
  assert.throws(() => validateFigureDatasets(entry.content, { 1: { ...entry.data.figureDatasets[1], file: '../other.csv' } }), /CSV filename/)
  assert.throws(() => validateFigureDatasets(entry.content, { 3: entry.data.figureDatasets[1] }), /caption does not match/)
  assert.throws(() => validateFigureDatasets(`${entry.content}\n\n![x](image.png)\n\nFigure 1. Duplicate\n`, entry.data.figureDatasets), /duplicated/)
})

test('the EV article maps both charts to the supplied datasets', async () => {
  const file = '../content/writing/european-industrial-policy-and-the-economic-consequences-of-chinese-ev-competition.md'
  const entry = parseMarkdownFile(await readFile(new URL(file, import.meta.url), 'utf8'))
  assert.doesNotThrow(() => validateFigureDatasets(entry.content, entry.data.figureDatasets))
  assert.equal(entry.data.figureDatasets[1].file, 'figure1_eu_battery_electric_imports_china_share_2021_2025_rawgraphs.csv')
  assert.equal(entry.data.figureDatasets[2].file, 'figure2_china_manufactured_bev_share_selected_eu_2024h1_rawgraphs.csv')
})
