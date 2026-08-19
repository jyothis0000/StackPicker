// Response headers are the only signal the page itself can't show us.
// Stored in session storage (not a Map) so it survives service-worker restarts.

const SIGNALS = [
  // Web servers
  { header: 'server', pattern: /nginx/i, name: 'Nginx', category: 'Web Server', color: '#009639' },
  { header: 'server', pattern: /apache/i, name: 'Apache', category: 'Web Server', color: '#D22128' },
  { header: 'server', pattern: /litespeed/i, name: 'LiteSpeed', category: 'Web Server', color: '#4A4A4A' },
  { header: 'server', pattern: /microsoft-iis/i, name: 'IIS', category: 'Web Server', color: '#5E5E5E' },
  { header: 'server', pattern: /caddy/i, name: 'Caddy', category: 'Web Server', color: '#22B638' },
  { header: 'server', pattern: /openresty/i, name: 'OpenResty', category: 'Web Server', color: '#E4002B' },
  { header: 'server', pattern: /envoy/i, name: 'Envoy', category: 'Web Server', color: '#AC6199' },
  { header: 'server', pattern: /varnish/i, name: 'Varnish', category: 'Web Server', color: '#C6403D' },
  { header: 'x-varnish', pattern: /./, name: 'Varnish', category: 'Web Server', color: '#C6403D' },
  { header: 'server', pattern: /gunicorn/i, name: 'Gunicorn', category: 'Web Server', color: '#4B8F29' },
  { header: 'server', pattern: /kestrel/i, name: 'Kestrel', category: 'Web Server', color: '#512BD4' },
  { header: 'server', pattern: /werkzeug/i, name: 'Werkzeug (Flask)', category: 'Web Server', color: '#3C3C3C' },
  { header: 'server', pattern: /phusion passenger/i, name: 'Phusion Passenger', category: 'Web Server', color: '#CC0000' },
  { header: 'server', pattern: /cowboy/i, name: 'Cowboy (Erlang)', category: 'Web Server', color: '#A90533' },
  { header: 'server', pattern: /tomcat/i, name: 'Apache Tomcat', category: 'Web Server', color: '#F8DC75' },

  // Languages / frameworks
  { header: 'x-powered-by', pattern: /php/i, name: 'PHP', category: 'Backend Language', color: '#777BB4' },
  { header: 'x-powered-by', pattern: /asp\.net/i, name: 'ASP.NET', category: 'Backend Framework', color: '#512BD4' },
  { header: 'x-aspnet-version', pattern: /./, name: 'ASP.NET', category: 'Backend Framework', color: '#512BD4' },
  { header: 'x-powered-by', pattern: /express/i, name: 'Express', category: 'Backend Framework', color: '#259DFF' },
  { header: 'x-powered-by', pattern: /next\.js/i, name: 'Next.js', category: 'JS Framework', color: '#0070F3' },
  { header: 'x-powered-by', pattern: /nuxt/i, name: 'Nuxt', category: 'JS Framework', color: '#00DC82' },
  { header: 'x-powered-by', pattern: /servlet|jsp/i, name: 'Java', category: 'Backend Language', color: '#F89820' },
  { header: 'x-powered-by', pattern: /phusion passenger/i, name: 'Ruby on Rails', category: 'Backend Framework', color: '#CC0000' },

  // CMS / platform
  { header: 'x-drupal-cache', pattern: /./, name: 'Drupal', category: 'CMS', color: '#0678BE' },
  { header: 'x-generator', pattern: /drupal/i, name: 'Drupal', category: 'CMS', color: '#0678BE' },
  { header: 'x-powered-by', pattern: /wp engine|w3 total cache/i, name: 'WordPress', category: 'CMS', color: '#21759B' },
  { header: 'x-shopify-stage', pattern: /./, name: 'Shopify', category: 'E-Commerce', color: '#96BF48' },
  { header: 'x-wix-request-id', pattern: /./, name: 'Wix', category: 'Website Builder', color: '#FAAD00' },
  { header: 'x-litespeed-cache', pattern: /./, name: 'LiteSpeed Cache', category: 'Web Server', color: '#4A4A4A' },

  // Hosting / CDN
  { header: 'cf-ray', pattern: /./, name: 'Cloudflare', category: 'CDN', color: '#F48120' },
  { header: 'server', pattern: /cloudflare/i, name: 'Cloudflare', category: 'CDN', color: '#F48120' },
  { header: 'x-vercel-id', pattern: /./, name: 'Vercel', category: 'Hosting', color: '#5E5E5E' },
  { header: 'server', pattern: /vercel/i, name: 'Vercel', category: 'Hosting', color: '#5E5E5E' },
  { header: 'x-nf-request-id', pattern: /./, name: 'Netlify', category: 'Hosting', color: '#00C7B7' },
  { header: 'server', pattern: /netlify/i, name: 'Netlify', category: 'Hosting', color: '#00C7B7' },
  { header: 'server', pattern: /github\.com/i, name: 'GitHub Pages', category: 'Hosting', color: '#6E7681' },
  { header: 'server', pattern: /amazons3/i, name: 'Amazon S3', category: 'Hosting', color: '#569A31' },
  { header: 'x-amz-cf-id', pattern: /./, name: 'Amazon CloudFront', category: 'CDN', color: '#8C4FFF' },
  { header: 'server', pattern: /google frontend|gse|gws/i, name: 'Google Cloud', category: 'Hosting', color: '#4285F4' },
  { header: 'x-fastly-request-id', pattern: /./, name: 'Fastly', category: 'CDN', color: '#FF282D' },
  { header: 'server', pattern: /fastly/i, name: 'Fastly', category: 'CDN', color: '#FF282D' },
  { header: 'server', pattern: /akamai/i, name: 'Akamai', category: 'CDN', color: '#009BDB' },
  { header: 'x-akamai-transformed', pattern: /./, name: 'Akamai', category: 'CDN', color: '#009BDB' },
  { header: 'x-served-by', pattern: /cache-.*\.bunnycdn|bunnycdn/i, name: 'BunnyCDN', category: 'CDN', color: '#FF8000' },
]

chrome.webRequest.onResponseStarted.addListener(
  ({ type, tabId, responseHeaders }) => {
    if (type !== 'main_frame' || tabId < 0) return

    const headers = new Map(
      (responseHeaders ?? []).map(h => [h.name.toLowerCase(), h.value ?? ''])
    )
    const found = []

    for (const sig of SIGNALS) {
      const value = headers.get(sig.header)
      if (value === undefined || !sig.pattern.test(value)) continue
      if (found.some(f => f.name === sig.name)) continue
      found.push({ name: sig.name, category: sig.category, color: sig.color })
    }

    chrome.storage.session.set({ [`hdr_${tabId}`]: found })
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
)

chrome.tabs.onRemoved.addListener(tabId => chrome.storage.session.remove(`hdr_${tabId}`))
