# ChatGPT Violet Void

`src/chatgpt-violet-void.user.css` is the sole authored UserStyle. It gives ChatGPT an exact
near-black Violet Void palette with Rubik UI text, JetBrains Mono code, a teal block caret, rounded
focus frames, and sticky Copy controls while leaving ChatGPT's native thread and composer widths
authoritative. It intentionally adds no custom syntax highlighting.

Run `npm run build` to copy the source, with normalized LF newlines, to the tracked installable
artifact `dist/chatgpt-violet-void.user.css`. When the CSS changed since the last build, the patch
version is bumped automatically in the `src/` header, `package.json`, and `dist/`; unchanged
rebuilds bump nothing. Use `npm run bump` to force a patch bump. The artifact is deliberately
byte-identical to its source; `npm run verify:artifact` checks that invariant, the version metadata
(derived from `package.json`), and that the legacy root artifact is absent.

Install the tracked [`dist/chatgpt-violet-void.user.css`](dist/chatgpt-violet-void.user.css)
artifact. Existing v5.4.3 installs still point to the retired root update URL and need one manual
reinstall from `dist/`; future updates use the new URL. In Stylus, check for updates and confirm the
installed version is at least **5.4.11**, then reload ChatGPT. If the installed style still uses the
retired root URL or was pasted manually, open the raw `dist/` UserStyle to update that installation.

## Theme activation compatibility

Version 5.4.11 republishes the previously stale installable artifact and supports explicit `dark`
classes, `data-theme="dark"`, and `data-color-scheme="dark"` on `html` or `body`. Explicit light
markers win during theme switches; dark classes inside a code preview do not activate the entire
page. The document background and native color tokens also reach `body` and the app root without
changing ChatGPT's layout. The Learn site keeps its separate palette and native typography.

The new activation tests use synthetic compatibility fixtures, not a captured authenticated
ChatGPT rollout. They exercise the shipped `dist/` CSS, typing, native widths, root backgrounds,
light-mode exclusions, and theme changes without reload. Live-site verification remains a separate
step below; selector compatibility alone cannot diagnose a disabled extension or a stale local install.

Use `npm run lint` for plain-CSS linting, `npm test` for the Playwright regression suite, and
`npm run build && npm run check` before publishing. `check` does not rebuild or repair files: it
must reject stale source/dist/version combinations rather than conceal an unpublished change.
Browser fixtures run in Chromium and Firefox and cover dark-only palette and font scope, native
ChatGPT thread/composer widths, block-caret behavior, attachment/image guards, and sticky, visible,
clickable Copy controls. A legacy `overflow: hidden` control case proves the clipping regression
the theme prevents. Install the managed Firefox fixture engine with `npx playwright install firefox`
before running the full suite.

## Manual live-site QA

`npm run dev:browser` is an optional real-site QA layer; it does not replace the fast fixture tests.
The extension comes only from the latest official
[OpenStyles Stylus release](https://github.com/openstyles/stylus/releases): run
`npm run setup:stylus -- --check` to compare the ignored cache to GitHub, `npm run setup:stylus` to
download, verify, and unpack the official Firefox archive, or `npm run dev:browser:setup` to set it
up and launch in one opt-in step. `npm run setup:stylus -- --dry-run` reads release metadata without
downloading. An explicit `STYLUS_EXTENSION_PATH` still overrides the cache.

The first `npm run dev:browser` run opens the isolated persistent Firefox profile through local
`web-ext`. That profile is unsuitable for daily browsing. First close any stuck old QA window so its
profile lock is released, then manually complete any Cloudflare “Verify you are human” challenge,
ChatGPT login, and UserStyle confirmation. CAPTCHA handling and credentials are never automated.
Later runs reuse that profile’s login cookies/session and locally installed dev UserStyle.

Full live QA means opening a representative authenticated long code response, then scrolling and
interacting with its Copy control. Fixture tests remain the Chromium and Firefox Playwright CI gate.
The launcher serves the built `dist/chatgpt-violet-void.user.css` installer only on `127.0.0.1` at
`/chatgpt-violet-void.user.css`, then opens it alongside `https://chatgpt.com` and the Learn
refactor use case. The unpacked extension is loaded only into the isolated QA profile, never into
your normal browser.

The isolated Firefox profile defaults to `.violet-void-firefox-profile` and persists login and the
locally installed style between runs; the verified release cache is `.violet-void-stylus`. Both the
new profile and the retired `.violet-void-dev-profile` are ignored by Git. If verification still
loops after this launcher change, close Firefox, inspect and remove only
`.violet-void-firefox-profile`, then rerun; that intentionally resets only isolated login/style
state. Use `node scripts/dev-browser.js --help` or `node scripts/setup-stylus.js --help` for exact
behavior. The launcher never automates extension confirmation or credentials.
