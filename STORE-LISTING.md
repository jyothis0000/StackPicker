# Chrome Web Store listing — StackPicker

Copy-paste source for the Developer Dashboard. Keep this in sync with `manifest.json`.

---

## Store listing tab

**Item name**

```
StackPicker — Website Tech Stack Detector
```

**Short description** (132 char max — this is 118)

```
See the tech stack behind any website: frameworks, CMS, servers, CDNs and 400+ more, in one click. No account needed.
```

**Category:** Developer Tools
**Language:** English

**Detailed description**

```
StackPicker tells you what any website is built with. Click the icon and it
reports the frameworks, CMS, e-commerce platform, analytics, web server, CDN
and hosting behind the page you are on — over 400 technologies in all.

WHAT IT DETECTS

• JavaScript frameworks — React, Next.js, Vue, Nuxt, Angular, Svelte, Astro,
  Remix, Solid, Qwik, Alpine, htmx, Livewire, Blazor and more
• CMS and site builders — WordPress, Drupal, Joomla, Ghost, Webflow, Wix,
  Squarespace, Framer, Shopify, Magento, WooCommerce, BigCommerce
• Backend — PHP, Laravel, Django, Rails, ASP.NET, Express, Spring, CodeIgniter
• Servers and infrastructure — Nginx, Apache, LiteSpeed, IIS, Caddy, Cloudflare,
  Fastly, Akamai, Vercel, Netlify, AWS, Azure, Heroku
• Analytics and marketing — Google Analytics, GTM, Meta Pixel, Hotjar, PostHog,
  Segment, Klaviyo, HubSpot, Intercom
• UI and libraries — Tailwind, Bootstrap, Material UI, jQuery, GSAP, Three.js,
  Chart.js, Swiper

HOW IT IS DIFFERENT

Detection runs only when you click. Nothing watches your browsing in the
background, and results are grouped by category so you can read a stack at a
glance rather than scrolling a flat list.

PRIVACY

StackPicker collects nothing. No accounts, no tracking, no analytics, no
servers. Everything is analysed locally in your browser and discarded the
moment you close the popup. Nothing about the pages you visit ever leaves
your machine.

Free and open source.
```

**Support email** (shown on the listing, and the address users write to)

```
connect@jyothismanoj.com
```

> Also set this as the **contact email** under Account → Contact email, and
> verify it. An unverified contact email blocks publishing.

---

## Privacy tab

**Single purpose description**

```
StackPicker has one purpose: to identify and display the web technologies used
by the page the user is currently viewing. When the user clicks the toolbar
icon, it inspects that page's markup, script URLs and response headers, matches
them against a local fingerprint database, and shows the result in a popup.
```

**Permission justifications**

`scripting`

```
Required to inject the detection routine into the active tab when the user
clicks the toolbar icon. The routine must run in the page's own JavaScript
context in order to read framework globals such as window.React or
window.Shopify, which are invisible from an isolated content script. It runs
only in response to that click.
```

`activeTab`

```
Grants temporary access to the tab the user is looking at, and only in response
to them clicking the StackPicker toolbar icon. That access is used solely to
read the current page's markup, script URLs and response headers in order to
identify the technologies it uses. Access ends when the user navigates away. No
page content is stored, transmitted or shared.
```

> StackPicker deliberately requests **no host permissions**. `activeTab` covers
> everything it does, because detection only ever runs on an explicit click.
> Declaring `<all_urls>` instead triggers the store's "Broad Host Permissions"
> warning and an in-depth review, for access the extension never uses.

**Remote code:** No, I am not using remote code.

> All logic and the fingerprint database ship inside the package. Nothing is
> fetched or evaluated at runtime.

**Data usage — check nothing.** StackPicker collects none of the categories
listed (personally identifiable information, health, financial, authentication,
personal communications, location, browsing history, user activity, website
content). Page content is read transiently in memory to produce the result and
is never written to storage or sent anywhere.

**Certifications — tick all three:**

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** host `PRIVACY.md` (GitHub Pages, or the repo's raw file)
and paste the link here.

---

## Assets checklist

Everything lives in [`store-assets/`](store-assets/) — see its
[README](store-assets/README.md) for the full map and re-rendering steps.

| Asset | Size | Required | File |
|---|---|---|---|
| Store icon | 128×128 | Yes | `store-assets/icon-128.png` |
| Screenshot | 1280×800 | Yes (min 1, max 5) | `store-assets/screenshot-1.png`, `-2`, `-3` |
| Small promo tile | 440×280 | Optional | `store-assets/promo-440x280.png` |
| Marquee promo tile | 1400×560 | Optional | `store-assets/marquee-1400x560.png` |

All of them are generated, not hand-drawn: the `.html` file beside each PNG is
its source, and the popup mockups pull in `src/popup/style.css` directly, so
restyling the popup and re-shooting keeps the store images honest.

The icons in `store-assets/` are listing copies. The extension builds from
`public/icon*.png` — leave those alone.

---

## Before submitting

- [ ] `npm run package` → upload `stackpicker-<version>.zip`
- [ ] Bump `version` in `manifest.json` for every resubmission — the store
      rejects a re-upload of a version it already has
- [ ] Privacy policy URL is live and reachable
- [ ] Contact email `connect@jyothismanoj.com` verified under Account → Contact email
