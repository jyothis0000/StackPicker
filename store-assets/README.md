# Store assets

Every image the Chrome Web Store listing needs, plus the sources they are
rendered from. Text for the listing fields lives in [`../STORE-LISTING.md`](../STORE-LISTING.md).

## What to upload where

| Dashboard field | File | Size | Required |
|---|---|---|---|
| Store icon | `icon-128.png` | 128×128 | Yes |
| Screenshots | `screenshot-1.png`, `screenshot-2.png`, `screenshot-3.png` | 1280×800 | Yes (1–5) |
| Small promo tile | `promo-440x280.png` | 440×280 | Optional |
| Marquee promo tile | `marquee-1400x560.png` | 1400×560 | Optional — needed for featured placement |

`icon-16.png`, `icon-32.png` and `icon-48.png` are here for completeness (press
kits, README badges, favicons). The store itself only asks for the 128.

> **The extension does not build from this folder.** Its icons load from
> `../public/`, which Vite copies into `dist/`. The files here are copies for
> the listing — deleting `../public/icon*.png` would break the build.

## Sources

Each PNG has a same-named `.html` beside it. The two `popup-*.html` mockups pull
in `../src/popup/style.css` directly, so a change to the popup's real styling
shows up the next time these are re-rendered — the screenshots cannot silently
drift from the product.

| Source | Renders to |
|---|---|
| `screenshot-1.html` | `screenshot-1.png` — hero, popup on a Next.js site |
| `screenshot-2.html` | `screenshot-2.png` — full stack grouped by category |
| `screenshot-3.html` | `screenshot-3.png` — coverage grid |
| `promo-440x280.html` | `promo-440x280.png` |
| `marquee-1400x560.html` | `marquee-1400x560.png` |
| `popup-nextjs.html`, `popup-wordpress.html` | embedded by the screenshots |
| `frame.css` | shared 1280×800 canvas |

## Re-rendering

`file://` will not load the shared stylesheet, so serve the repo root:

```sh
python -m http.server 8765        # from the repo root, not from here
```

Then screenshot each page at its exact pixel size (the filename states it) with
the viewport set to match — no full-page capture, no device scaling.

Sample sites shown in the mockups use `example.com` placeholders on purpose:
real third-party domains in store screenshots can read as implied endorsement.
