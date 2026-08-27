# Third-party attribution

## Technology fingerprint data

`src/technologies/*.json` is derived from the **webappanalyzer** dataset:

> https://github.com/enthec/webappanalyzer
> Copyright © enthec Analytics S.L. and contributors
> Licensed under the GNU General Public License v3.0 (GPL-3.0)

webappanalyzer is the community-maintained continuation of the Wappalyzer
technology database, from its last MIT-licensed commit before Wappalyzer's
own 2023 relicense.

**What was changed:** the raw entries (keyed by name, in webappanalyzer's own
schema — `cats`, `js`, `scriptSrc`, `dom`, `meta`, `cookies`, `headers`, …)
were converted into StackPicker's own `{name, category, color, detect}`
schema. Fields with no client-visible equivalent in a browser extension
(`dns`, `xhr`, `text`, `probe`, `css`, `url`, `robots`, `pricing`, `saas`,
`website`, `icon`, `description`, …) were dropped; category IDs were
re-bucketed into StackPicker's own, much smaller, category set; `dom`
selectors requiring per-element text/attribute inspection we have no way to
verify were dropped rather than approximated. The conversion script lives in
project history for anyone who wants to redo it against a newer upstream
dataset.

**Because this derived data is bundled in the distributed extension,
StackPicker as a whole is licensed under GPL-3.0 — see [LICENSE](LICENSE).**
This is not a stylistic choice; it's what GPL-3.0 requires of anything that
incorporates the covered work.

## Everything else

The detection engine (`src/detect.js`), the browser extension scaffolding
(`manifest.json`, `src/background/`, `src/popup/`), the ~429 originally
hand-written fingerprints that predate the webappanalyzer import, and the
build tooling are original work by the StackPicker project, likewise
released under GPL-3.0.
