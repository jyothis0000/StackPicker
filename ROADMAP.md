# StackPicker Roadmap

_Last reviewed: 2026-10-23 · current version 1.1.0_

## Where things stand

StackPicker is a small Manifest V3 extension (~200 lines of real code):

- **`src/popup/main.js`**: on click, injects `detectInPage` into the active tab (MAIN world, `activeTab` + `scripting` only), then groups results by category and renders them with logos and links.
- **`src/detect.js`**: matches 3,599 fingerprints against JS globals, DOM node props, script/link URLs, meta tags, HTML (first 1 MB), cookies and response headers (one same-origin `HEAD` request).
- **`src/technologies/*.json`**: data converted from webappanalyzer (GPL-3.0); 3,096 bundled logos (~21 MB).
- **`test-detect.mjs`**: regression checks with a fake DOM. `npm test` passes.

It works, and the privacy model is good: no host permissions and no background script. The issues below come from reading the code and running checks against the dataset.

---

## Phase 1: Correctness fixes (do first)

| # | Issue | Evidence | Fix |
|---|---|---|---|
| 1.1 | **Dotted JS globals never match.** `hasGlobal` does `window[g]`, so `"AFRAME.version"` looks for a global literally named `AFRAME.version`. | 674 of 2,843 `js` keys are dotted; **120 technologies can only be detected this way**, so they are never detected. | Walk the path: `g.split('.').reduce((o, k) => o?.[k], window)`. Add a test. |
| 1.2 | **One bad regex wipes out the whole scan.** `new RegExp(...)` inside `.filter` throws, `executeScript` rejects, and the user sees "No technologies detected". | 0 bad patterns today, but nothing guards against the next data import adding one. | Wrap each test in try/catch, and add a test asserting that every pattern compiles. |
| 1.3 | **Cookie match is a substring of the whole cookie string.** `cookies.includes('sid')` matches any cookie named `*sid*`, or one whose value contains it. | `detect.js`, last line of the filter | Parse `document.cookie` into names and match exact names (or regex). |
| 1.4 | **Single snapshot at popup open.** SPAs and lazy-loaded tags often aren't there yet; the empty state just says "reload and retry". | `scan()` runs once | Add a "Rescan" button in the popup. Skip auto-polling. |
| 1.5 | **Regexes recompiled on every check.** About 3,800 patterns are compiled with `new RegExp` inside the filter, once per evaluation. | `detect.js` | Fine for now. Precompile once per scan only if profiling shows a slow popup. |

## Phase 2: Data pipeline and repo hygiene

- **2.1 Commit the conversion script.** `NOTICE.md` says it "lives in project history", but `git log --all` shows it was never committed. Without it, the dataset can't be refreshed from upstream. Add `scripts/convert.mjs` that reads raw webappanalyzer JSON and writes `src/technologies/*.json`.
- **2.2 Rename or move `src/technologies-demo/`.** It is the *raw* upstream data (different schema, not imported anywhere) sitting next to the real data. Move it to `data/upstream/` as the converter's input, or delete it once 2.1 can fetch upstream directly.
- **2.3 Fix stale `NOTICE.md` text.** It mentions `src/background/`, which no longer exists, and the conversion-script claim from 2.1.
- **2.4 Move `test-detect.mjs`** to `test/` (optional; it's fine at root).
- **2.5 Repo size.** `node_modules/` and `dist/` were committed in early history. They are ignored now, but they still bloat clones. Rewrite history only if clone size becomes a real problem.
- **2.6 Cross-platform `npm run package`.** It currently shells out to PowerShell `Compress-Archive`. Fine for a solo Windows dev; switch only if someone else needs to build.
- **2.7 CI.** A GitHub Action running `npm test && npm run build` on every PR. One small YAML file.

## Phase 3: Detection depth

Ordered by detection gain per line of code:

- **3.1 `implies`.** Restore webappanalyzer's `implies` during conversion (WooCommerce → WordPress → PHP; Next.js → React). This is cheap and catches many server-side technologies the browser can't see directly. It needs 2.1.
- **3.2 Versions.** Many patterns already have a capture group (`([\d.]+)`) that is thrown away. Show "WordPress 6.5" when there is a match. This needs the `\;version:\1` tags kept during conversion.
- **3.3 `excludes`.** Lets one technology rule out another when both match (e.g. two hosting providers). Add only if false-positive reports show up.
- **3.4 Restore dropped `dom` selectors** that are plain existence checks (`document.querySelector(sel)`); these were dropped wholesale.
- **3.5 Confidence.** Skip it. Binary detection is easier to understand, and nobody has asked for it.

## Phase 4: Popup UX

- **4.1 Rescan button** (see 1.4).
- **4.2 Copy / export.** One button that copies the stack as Markdown or plain text. This is the feature people most often request from this kind of tool.
- **4.3 Filter box**, but only when the result list is long (more than about 15 items).
- **4.4 Toolbar badge with the count.** It would need a background worker plus host permissions or `webNavigation` to scan automatically. **That breaks the "nothing runs until you click" privacy promise** in `PRIVACY.md` and the store listing. Recommendation: don't build it, or make it opt-in via `optional_host_permissions`.
- **4.5 Dark mode.** Add a `prefers-color-scheme` block in `style.css` if it isn't there already.

## Phase 5: Size and distribution

- **5.1 Shrink the icons (~21 MB).** Run SVGO over the SVGs and convert large PNGs to WebP. This would probably halve the package. The store size limit isn't close, but install and update time is.
- **5.2 Firefox / Edge.** Edge works as-is. Firefox MV3 supports `scripting.executeScript` with `world: 'MAIN'` from FF 128+. Test it, then add `browser_specific_settings` to the manifest.
- **5.3 Periodic dataset refresh.** Once 2.1 exists, re-run the converter against upstream each quarter and cut a minor release.

---

## Explicitly not planned

- **Remote fingerprint fetching or any server.** Bundled data keeps it offline and private.
- **Analytics or telemetry.** It would contradict `PRIVACY.md`.
- **Auto-scan on every page load.** See 4.4.
- **A framework (React etc.) for the popup.** The popup is ~130 lines of DOM code and doesn't need one.

## Suggested order

`1.1 → 1.2 → 1.3 → 2.1 → 2.2/2.3 → 4.1 → 3.1 → 3.2 → 4.2 → 2.7 → 5.1 → rest as needed`

Phase 1 is roughly one afternoon. 1.1 alone recovers 120 technologies that can currently never be detected.
