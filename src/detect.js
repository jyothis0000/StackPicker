// Serialized by chrome.scripting.executeScript — must stay closure-free.
// Runs in the page's MAIN world — a content script's isolated `window` can
// never see globals like React / Shopify / wp, which is why they never matched.
export function detectInPage(fps) {
  const srcs = Array.from(
    document.querySelectorAll('script[src], link[href]'),
    e => e.src || e.href
  ).join(' ')

  const metas = {}
  for (const m of document.querySelectorAll('meta[name], meta[property]')) {
    const key = (m.name || m.getAttribute('property') || '').toLowerCase()
    if (key) metas[key] = (m.content || '').toLowerCase()
  }

  // ponytail: 1MB cap keeps ~130 regexes cheap on huge pages; raise if a real miss shows up
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

  const hasGlobal = g => {
    try { return window[g] !== undefined && window[g] !== null } catch { return false }
  }

  return fps
    .filter(({ detect: d }) =>
      (d.js || []).some(hasGlobal) ||
      (d.prop || []).some(p => new RegExp(p).test(props)) ||
      (d.script || []).some(p => new RegExp(p, 'i').test(srcs)) ||
      (d.meta || []).some(m => {
        const key = m.name.toLowerCase()
        // empty content = presence of the tag is enough
        return m.content ? (metas[key] || '').includes(m.content.toLowerCase()) : key in metas
      }) ||
      (d.html || []).some(p => new RegExp(p, 'i').test(html)) ||
      (d.cookie || []).some(c => cookies.includes(c))
    )
    .map(({ name, category, color }) => ({ name, category, color }))
}
