// Serialized by chrome.scripting.executeScript — must stay closure-free.
// Runs in the page's MAIN world — a content script's isolated `window` can
// never see globals like React / Shopify / wp, which is why they never matched.
export async function detectInPage(fps) {
  const srcs = Array.from(
    document.querySelectorAll('script[src], link[href]'),
    e => e.src || e.href
  ).join(' ')

  const metas = {}
  for (const m of document.querySelectorAll('meta[name], meta[property]')) {
    const key = (m.name || m.getAttribute('property') || '').toLowerCase()
    if (key) metas[key] = (m.content || '').toLowerCase()
  }

  // ponytail: 1MB cap keeps ~150 regexes cheap on huge pages; raise if a real miss shows up
  const html = document.documentElement.innerHTML.slice(0, 1_000_000)
  const cookies = document.cookie

  // Own properties a framework attaches to real DOM nodes (__reactFiber$, __ngContext__,
  // __vue_app__). The only reliable signal for bundled apps that expose no global and
  // no recognisable script filename. 200 nodes is plenty — roots are near the top.
  const domProps = new Set()
  for (const el of Array.from(document.querySelectorAll('body, body *')).slice(0, 200)) {
    for (const key of Object.keys(el)) domProps.add(key)
  }
  const props = Array.from(domProps).join(' ')

  // Server headers (nginx, x-powered-by, cf-ray…) are the one signal the DOM can't show.
  // Same-origin means no CORS filtering, so every header is readable — which is why this
  // needs no host permission at all. HEAD keeps it to one bodyless request per popup open.
  // ponytail: a page with `connect-src 'none'` just yields no header signals; acceptable.
  const headers = new Map()
  try {
    const res = await fetch(location.href, { method: 'HEAD', redirect: 'follow' })
    for (const [k, v] of res.headers) headers.set(k.toLowerCase(), v)
  } catch {}

  const hasGlobal = g => {
    try { return window[g] !== undefined && window[g] !== null } catch { return false }
  }

  return fps
    .filter(({ detect: d }) =>
      (d.js || []).some(hasGlobal) ||
      (d.prop || []).some(p => new RegExp(p).test(props)) ||
      (d.script || []).some(p => new RegExp(p, 'i').test(srcs)) ||
      (d.header || []).some(h => {
        const value = headers.get(h.name)
        // empty pattern = presence of the header is enough
        return value !== undefined && (!h.pattern || new RegExp(h.pattern, 'i').test(value))
      }) ||
      (d.meta || []).some(m => {
        const key = m.name.toLowerCase()
        // empty content = presence of the tag is enough. Regex, not substring: many
        // imported patterns are real regexes (e.g. "^AsciiDoc ([\d.]+)"), not literal text.
        return m.content ? new RegExp(m.content, 'i').test(metas[key] || '') : key in metas
      }) ||
      (d.html || []).some(p => new RegExp(p, 'i').test(html)) ||
      (d.cookie || []).some(c => cookies.includes(c))
    )
    .map(({ name, category, color, website }) => ({ name, category, color, website }))
}
