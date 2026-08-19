import fingerprints from '../fingerprints.json'
import { detectInPage } from '../detect.js'

const CATEGORY_ORDER = [
  'CMS', 'E-Commerce', 'Website Builder', 'JS Framework', 'JS Library', 'UI / CSS',
  'Backend Framework', 'Backend Language', 'Web Server', 'Hosting', 'CDN',
  'Analytics', 'Marketing', 'Payment', 'Security', 'Search', 'Media',
  'Build Tool', 'Dev Tools',
]

async function scan() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !/^https?:/.test(tab.url || '')) return null

  const [stored, injected] = await Promise.all([
    chrome.storage.session.get(`hdr_${tab.id}`),
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: detectInPage,
        args: [fingerprints],
      })
      .catch(() => null),
  ])

  const page = injected?.[0]?.result ?? []
  const headers = stored[`hdr_${tab.id}`] ?? []

  const seen = new Set()
  const techs = [...page, ...headers].filter(t => !seen.has(t.name) && seen.add(t.name))

  return { techs, hostname: new URL(tab.url).hostname.replace(/^www\./, '') }
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

  const sorted = [...groups].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0])
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

      const dot = document.createElement('span')
      dot.className = 'dot'

      const name = document.createElement('span')
      name.className = 'name'
      name.textContent = t.name // textContent: names can come from page-controlled meta tags

      li.append(dot, name)
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
