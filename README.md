# ChatGPT Violet Void

`src/chatgpt-violet-void.user.css` is the sole authored UserStyle. It gives ChatGPT a dark-only
violet-gray base with Rubik UI text, JetBrains Mono code, a teal block caret, rounded focus frames,
and sticky Copy controls while leaving ChatGPT's native thread and composer widths authoritative.
It intentionally adds no custom syntax highlighting.

Run `npm run build` to copy the source, with normalized LF newlines, to the tracked installable
artifact `dist/chatgpt-violet-void.user.css`. The artifact is deliberately byte-identical to its
source; `npm run verify:artifact` checks that invariant, the v5.4.4 update metadata, and that the
legacy root artifact is absent.

Install the tracked [`dist/chatgpt-violet-void.user.css`](dist/chatgpt-violet-void.user.css)
artifact. Existing v5.4.3 installs still point to the retired root update URL, so after the v5.4.4
URL migration is published they need one manual reinstall from `dist/`; future updates use the new
URL.

Use `npm run lint` for plain-CSS linting, `npm test` for the Playwright regression suite, and
`npm run check` for the complete deterministic check. Browser fixtures cover dark-only palette and
font scope, native ChatGPT thread/composer widths, block-caret behavior, attachment/image guards,
and sticky, visible, clickable Copy controls. A legacy `overflow: hidden` control case proves the
clipping regression the theme prevents.

## Manual live-site QA

`npm run dev:browser` is an optional real-site QA layer; it does not replace the fast fixture tests.
The extension comes only from the latest official
[OpenStyles Stylus release](https://github.com/openstyles/stylus/releases): run
`npm run setup:stylus -- --check` to compare the ignored cache to GitHub, `npm run setup:stylus` to
download, verify, and unpack the official Chromium MV3 archive, or `npm run dev:browser:setup` to
set it up and launch in one opt-in step. `npm run setup:stylus -- --dry-run` reads release metadata
without downloading. An explicit `STYLUS_EXTENSION_PATH` still overrides the cache.

The first `npm run dev:browser` run opens the isolated persistent profile. This live-QA Chromium is
deliberately a plain child process, not Playwright-controlled: first close any stuck old QA window
so its profile lock is released, then manually complete any Cloudflare “Verify you are human”
challenge, ChatGPT login, and UserStyle confirmation. CAPTCHA handling and credentials are never
automated. Later runs reuse that profile’s login cookies/session and locally installed dev UserStyle.
Full live QA means opening a representative authenticated long code response, then scrolling and
interacting with its Copy control. Fixture tests remain the Playwright CI gate. The launcher uses
Playwright's bundled Chromium binary, but not Playwright browser automation; it serves the built
`dist/chatgpt-violet-void.user.css` installer only on `127.0.0.1` at
`/chatgpt-violet-void.user.css` and opens it alongside `https://chatgpt.com`. The unpacked extension
is loaded only into the isolated QA profile, never into your normal browser.

The isolated profile defaults to `.violet-void-dev-profile` and persists login and the locally
installed style between runs; the verified release cache is `.violet-void-stylus`. Both are ignored
by Git. If verification still loops after this launcher change, close Chromium, inspect and remove
only `.violet-void-dev-profile`, then rerun; that intentionally resets only isolated login/style
state. Use `node scripts/dev-browser.js --help` or `node scripts/setup-stylus.js --help` for exact
behavior. The launcher never automates extension confirmation or credentials.
