import { detectInPage } from '../detect.js'

// One file per first letter, the way Wappalyzer shards its dataset — glob them
// all in so adding a technology never means touching an import list.
const sharded = import.meta.glob('../technologies/*.json', { eager: true, import: 'default' })
const fingerprints = Object.values(sharded).flat()

const CATEGORY_ORDER = [
  'CMS', 'E-Commerce', 'Website Builder', 'JS Framework', 'JS Library', 'UI / CSS',
  'Backend Framework', 'Backend Language', 'Web Server', 'Hosting', 'CDN',
  'Analytics', 'Advertising', 'Marketing', 'Payment', 'Security', 'Search', 'Media',
  'Build Tool', 'Dev Tools',
]

async function scan() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !/^https?:/.test(tab.url || '')) return null

  // activeTab grants access to this one tab, granted by the click that opened
  // this popup — no standing host permission, nothing runs until the user asks.
  const injected = await chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: detectInPage,
      args: [fingerprints],
    })
    .catch(() => null)

  return {
    techs: injected?.[0]?.result ?? [],
    hostname: new URL(tab.url).hostname.replace(/^www\./, ''),
  }
}

function render(result) {
  const main = document.getElementById('results')
  main.textContent = ''

  if (!result) {
    main.append(state('Nothing to scan', 'Open a regular http(s) page and try again.'))
    return
  }

  document.getElementById('hostname').textContent = result.hostname

  const { techs } = result
  if (!techs.length) {
    main.append(state('No technologies detected', 'The page may still be loading — reload and retry.'))
    return
  }

  const count = document.getElementById('count')
  count.textContent = techs.length
  count.hidden = false

  const groups = new Map()
  for (const t of techs) {
    if (!groups.has(t.category)) groups.set(t.category, [])
    groups.get(t.category).push(t)
  }

  // A category missing from CATEGORY_ORDER must sort after the known ones, not
  // before — indexOf's -1 would otherwise put an unlisted category first.
  const rank = c => { const i = CATEGORY_ORDER.indexOf(c); return i === -1 ? Infinity : i }
  const sorted = [...groups].sort(
    (a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0])
  )

  for (const [category, items] of sorted) {
    const section = document.createElement('section')

    const h2 = document.createElement('h2')
    h2.textContent = category
    section.append(h2)

    const ul = document.createElement('ul')
    for (const t of items) {
      const li = document.createElement('li')
      li.style.setProperty('--tech', t.color)

      // A real logo when we bundled one for this technology, the color dot otherwise —
      // never both, and never a broken-image icon if a bundled file turns out bad.
      let mark
      if (t.icon) {
        mark = document.createElement('img')
        mark.className = 'icon'
        mark.alt = ''
        mark.loading = 'lazy'
        mark.src = chrome.runtime.getURL(`tech-icons/${encodeURIComponent(t.icon)}`)
        mark.onerror = () => {
          const dot = document.createElement('span')
          dot.className = 'dot'
          mark.replaceWith(dot)
        }
      } else {
        mark = document.createElement('span')
        mark.className = 'dot'
      }

      // Link out to the technology's own site when we have one. `website` comes from
      // our bundled fingerprint data, not the page, but still gate on http(s) — cheap
      // insurance against ever treating a stray value as a clickable href.
      const canLink = typeof t.website === 'string' && /^https?:\/\//.test(t.website)
      const name = document.createElement(canLink ? 'a' : 'span')
      name.className = 'name'
      name.textContent = t.name // textContent: names can come from page-controlled meta tags
      if (canLink) {
        name.href = t.website
        name.target = '_blank'
        name.rel = 'noopener noreferrer'
      }

      li.append(mark, name)
      ul.append(li)
    }
    section.append(ul)
    main.append(section)
  }
}

function state(title, hint) {
  const div = document.createElement('div')
  div.className = 'state'
  const strong = document.createElement('strong')
  strong.textContent = title
  const p = document.createElement('p')
  p.textContent = hint
  div.append(strong, p)
  return div
}

scan().then(render)
