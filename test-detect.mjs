// node test-detect.mjs
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { detectInPage } from './src/detect.js'

const DIR = './src/technologies'
const files = readdirSync(DIR).filter(f => f.endsWith('.json'))
const fingerprints = files.flatMap(f => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')))

// Minimal stand-in for the bits detectInPage touches.
function fakePage({ srcs = [], metas = {}, html = '', cookie = '', globals = {}, domProps = [], headers = {} }) {
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
  globalThis.location = { href: 'https://site.test/' }
  globalThis.fetch = async () => ({ headers: Object.entries(headers) })
}

const names = async page => {
  fakePage(page)
  return (await detectInPage(fingerprints)).map(t => t.name)
}

// The bug: every site was reported as Laravel, because a fingerprint with an
// empty meta `content` asked `val !== undefined` on a value defaulted to ''.
const wordpress = await names({
  srcs: ['https://site.test/wp-content/themes/x/app.js'],
  metas: { generator: 'WordPress 6.5', 'csrf-token': 'abc123' },
  html: '<div class="wp-block"></div>',
})
assert.ok(wordpress.includes('WordPress'), 'WordPress should be detected')
assert.ok(!wordpress.includes('Laravel'), 'Laravel must NOT match a csrf-token meta')

// A bare page matches nothing at all.
assert.deepEqual(await names({ html: '<html><body>hi</body></html>' }), [])

// Meta presence-only fingerprints still work when a fingerprint asks for content.
assert.ok((await names({ metas: { generator: 'Astro v4' } })).includes('Astro'))

// MAIN-world globals are what the old content script could never see.
assert.ok((await names({ globals: { Shopify: {} } })).includes('Shopify'))
assert.ok((await names({ cookie: 'laravel_session=xyz' })).includes('Laravel'))

// Next.js shipped a `polyfills-<hash>.js` chunk, which the old Angular script
// pattern matched — every Next.js site was also reported as Angular.
const next = await names({
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
const viteReact = await names({
  srcs: ['https://site.test/assets/index-DlbQ6a5s.js'],
  html: '<script type="module" crossorigin src="/assets/index-DlbQ6a5s.js"></script><div id="root"></div>',
  domProps: ['__reactContainer$xy9'],
})
assert.ok(viteReact.includes('React'), 'React should be detected from DOM fiber props')
assert.ok(viteReact.includes('Vite'), 'Vite should be detected from its build output')
assert.ok(!viteReact.includes('Angular'), 'no Angular on a React page')

// Real Angular still matches, on __ngContext__ rather than a filename.
assert.ok((await names({ domProps: ['__ngContext__'] })).includes('Angular'))

// Server headers replaced the webRequest background worker — same signals,
// read from a same-origin HEAD instead of a browser-wide request listener.
const served = await names({
  headers: { Server: 'nginx/1.24.0', 'X-Powered-By': 'PHP/8.2.1', 'cf-ray': '8a1b2c3d' },
})
assert.ok(served.includes('Nginx'), 'Nginx from the server header')
assert.ok(served.includes('PHP'), 'PHP from x-powered-by')
assert.ok(served.includes('Cloudflare'), 'Cloudflare from a presence-only cf-ray header')
assert.ok(!served.includes('Apache'), 'nginx is not Apache')

// A header fingerprint must not fire on an absent header.
assert.ok(!(await names({ headers: {} })).includes('Nginx'))

// Header detection degrades quietly when the page's CSP blocks fetch.
globalThis.fetch = async () => { throw new Error('blocked by CSP') }
globalThis.document = {
  querySelectorAll: () => [],
  documentElement: { innerHTML: '' },
  cookie: '',
}
globalThis.window = {}
assert.deepEqual(await detectInPage(fingerprints), [], 'a blocked fetch must not throw')

// Newly added fingerprints, one per detection type, so the shards stay wired up.
assert.ok((await names({ globals: { Highcharts: {} } })).includes('Highcharts'))
assert.ok((await names({ html: '<div data-radix-portal></div>' })).includes('Radix UI'))
assert.ok((await names({ headers: { Server: 'uvicorn' } })).includes('Uvicorn'))
assert.ok((await names({ cookie: 'ci_session=abc' })).includes('CodeIgniter'))
assert.ok((await names({ metas: { generator: 'Hugo 0.128' } })).includes('Hugo'))

// Each shard holds only names starting with its own letter, and no name is
// defined twice across files — a split dataset makes both easy to get wrong.
const all = new Map()
for (const f of files) {
  const letter = f.replace('.json', '')
  for (const fp of JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'))) {
    const first = fp.name[0].toLowerCase()
    assert.equal(/[a-z]/.test(first) ? first : '_', letter,
      `${fp.name} is in ${f}, should be in ${/[a-z]/.test(first) ? first : '_'}.json`)
    assert.ok(!all.has(fp.name), `${fp.name} is defined twice (${all.get(fp.name)} and ${f})`)
    all.set(fp.name, f)
  }
}

// Every regex in the data files compiles, and every entry is detectable at all.
for (const fp of fingerprints) {
  const { script = [], html = [], prop = [], header = [] } = fp.detect
  for (const p of [...script, ...html, ...prop]) new RegExp(p, 'i')
  for (const h of header) new RegExp(h.pattern || '', 'i')
  assert.ok(Object.keys(fp.detect).length, `${fp.name} has no detection rules`)
  assert.match(fp.color, /^#[0-9A-Fa-f]{6}$/, `${fp.name} has a bad color`)
}

console.log(`ok — ${fingerprints.length} technologies in ${files.length} files, all checks passed`)
