import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { formatReferenceCitations } from '../src/utils/referenceCitations.js'
import { parseMarkdownFile } from '../scripts/lib/content-utils.mjs'

const sample = `First[^1], second[^2], again[^3].

## References

Alpha. First reference.

Beta. Second reference.

[^1]: Beta, page 7.

[^2]: Alpha, page 2.

[^3]: Beta, page 9.
`

const mappings = {
  1: { reference: 'Beta.', note: 'Beta, page 7.' },
  2: { reference: 'Alpha.', note: 'Alpha, page 2.' },
  3: { reference: 'Beta.', note: 'Beta, page 9.' },
}

test('links citations to numbered references in first-citation order', () => {
  const result = formatReferenceCitations(sample, mappings)
  assert.match(result, /href="#reference-1" aria-label="Reference 1, Beta, page 7\."/)
  assert.match(result, /href="#reference-2" aria-label="Reference 2, Alpha, page 2\."/)
  assert.match(result, /href="#reference-1" aria-label="Reference 1, Beta, page 9\."/)
  assert.match(result, /<span id="reference-1"><\/span>1\. Beta\. Second reference\./)
  assert.match(result, /<span id="reference-2"><\/span>2\. Alpha\. First reference\./)
  assert.doesNotMatch(result, /\[\^\d+\]/)
})

test('rejects missing, unused and ambiguous citation mappings', () => {
  assert.throws(() => formatReferenceCitations(sample, { 1: mappings[1], 2: mappings[2] }), /do not match/)
  assert.throws(() => formatReferenceCitations(sample, { ...mappings, 2: { ...mappings[2], reference: 'Missing.' } }), /exactly one/)
  assert.throws(() => formatReferenceCitations(sample, { ...mappings, 1: { ...mappings[1], reference: '' } }), /Missing/)
  assert.throws(() => formatReferenceCitations(sample.replace('again[^3]', 'again'), mappings), /in-text/)
  assert.throws(() => formatReferenceCitations(sample.replace('Beta. Second reference.', 'Alpha. Other reference.'), { ...mappings, 1: { ...mappings[1], reference: 'Alpha.' } }), /exactly one/)
  assert.throws(() => formatReferenceCitations(sample.replace('Beta, page 7.', 'Other, page 7.'), mappings), /has changed/)
  assert.throws(() => formatReferenceCitations(`${sample}\n[^1]: Beta, page 7.\n`, mappings), /do not match/)
})

test('preserves ordinary footnotes when no mapping is configured', () => {
  assert.equal(formatReferenceCitations(sample), sample)
})

test('the published essays map every citation to its intended source', async () => {
  const files = [
    ['can-artificial-intelligence-beat-an-efficient-market.md', ['Fama, Eugene F.', 'Lo, Andrew W.']],
    ['the-political-economy-of-hong-kong-s-housing-crisis.md', [
      'Cheng, Ruijie.', 'Brown, Stephen,', 'Lee, Ada H. Y.,',
      'Housing Bureau. _Housing in Figures 2026_', 'Housing Bureau. ‘Housing Bureau - Publications',
      'Wong, Michael B.', 'Ronald, Richard,',
    ]],
  ]
  for (const [file, references] of files) {
    const entry = parseMarkdownFile(await readFile(new URL(`../content/writing/${file}`, import.meta.url), 'utf8'))
    const result = formatReferenceCitations(entry.content, entry.data.referenceCitations)
    for (const [index, prefix] of references.entries()) {
      assert.ok(result.includes(`<span id="reference-${index + 1}"></span>${index + 1}. ${prefix}`), `${file}: reference ${index + 1}`)
    }
  }
})
