// node test-detect.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { detectInPage } from './src/detect.js'

const fingerprints = JSON.parse(readFileSync('./src/fingerprints.json', 'utf8'))

// Minimal stand-in for the bits detectInPage touches.
function fakePage({ srcs = [], metas = {}, html = '', cookie = '', globals = {}, domProps = [] }) {
  const nodes = srcs.map(src => ({ src, href: '' }))
  const metaNodes = Object.entries(metas).map(([name, content]) => ({
    name, content, getAttribute: () => null,
  }))
  const elements = [Object.fromEntries(domProps.map(p => [p, 1]))]
  globalThis.document = {
    querySelectorAll: sel =>
      sel.startsWith('meta') ? metaNodes : sel.startsWith('body') ? elements : nodes,
    documentElement: { innerHTML: html },
    cookie,
  }
  globalThis.window = globals
}

const names = page => (fakePage(page), detectInPage(fingerprints).map(t => t.name))

// The bug: every site was reported as Laravel, because a fingerprint with an
// empty meta `content` asked `val !== undefined` on a value defaulted to ''.
const wordpress = names({
  srcs: ['https://site.test/wp-content/themes/x/app.js'],
  metas: { generator: 'WordPress 6.5', 'csrf-token': 'abc123' },
  html: '<div class="wp-block"></div>',
})
assert.ok(wordpress.includes('WordPress'), 'WordPress should be detected')
assert.ok(!wordpress.includes('Laravel'), 'Laravel must NOT match a csrf-token meta')

// A bare page matches nothing at all.
assert.deepEqual(names({ html: '<html><body>hi</body></html>' }), [])

// Meta presence-only fingerprints still work when a fingerprint asks for content.
assert.ok(names({ metas: { generator: 'Astro v4' } }).includes('Astro'))

// MAIN-world globals are what the old content script could never see.
assert.ok(names({ globals: { Shopify: {} } }).includes('Shopify'))
assert.ok(names({ cookie: 'laravel_session=xyz' }).includes('Laravel'))

// Next.js shipped a `polyfills-<hash>.js` chunk, which the old Angular script
// pattern matched — every Next.js site was also reported as Angular.
const next = names({
  srcs: [
    'https://site.test/_next/static/chunks/polyfills-c67a75d1b6f99dc8.js',
    'https://site.test/_next/static/chunks/main-app-abc.js',
  ],
  html: '<div id="__next"></div>',
  domProps: ['__reactFiber$k3l', '__reactProps$k3l'],
})
assert.ok(next.includes('Next.js'), 'Next.js should be detected')
assert.ok(next.includes('React'), 'a Next.js app is a React app')
assert.ok(!next.includes('Angular'), 'Angular must NOT match a Next.js polyfills chunk')

// A Vite-built React app: no window.React, no react-dom in any URL. DOM fiber
// props are the only thing left to go on — this used to detect nothing at all.
const viteReact = names({
  srcs: ['https://site.test/assets/index-DlbQ6a5s.js'],
  html: '<script type="module" crossorigin src="/assets/index-DlbQ6a5s.js"></script><div id="root"></div>',
  domProps: ['__reactContainer$xy9'],
})
assert.ok(viteReact.includes('React'), 'React should be detected from DOM fiber props')
assert.ok(viteReact.includes('Vite'), 'Vite should be detected from its build output')
assert.ok(!viteReact.includes('Angular'), 'no Angular on a React page')

// Real Angular still matches, on __ngContext__ rather than a filename.
assert.ok(names({ domProps: ['__ngContext__'] }).includes('Angular'))

// Every regex in the data file compiles.
for (const fp of fingerprints) {
  const { script = [], html = [], prop = [] } = fp.detect
  for (const p of [...script, ...html, ...prop]) new RegExp(p, 'i')
}

console.log(`ok — ${fingerprints.length} fingerprints, all checks passed`)
