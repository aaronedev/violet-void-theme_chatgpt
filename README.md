# ChatGPT Violet Void Wide

`src/chatgpt-violet-void.user.css` is the sole authored UserStyle. Run `npm run build` to copy it, with normalized LF newlines, to the installable root artifact `chatgpt-violet-void.user.css`. The artifact is deliberately byte-identical to its source; `npm run verify:artifact` checks that invariant and the update metadata.

Use `npm run lint` for plain-CSS linting, `npm test` for the Playwright regression suite, and `npm run check` for the complete deterministic check. The browser fixture loads the canonical stylesheet itself and covers both ChatGPT code-wrapper selector families at desktop and mobile sizes. It verifies that the code header stays viewport-sticky while scrolling, that Copy is visible and clickable, and that header/control contrast remains readable. A legacy `overflow: hidden` control case proves the regression the clipping change prevents.

## Manual live-site QA

`npm run dev:browser` is an optional real-site QA layer; it does not replace the fast fixture tests. Obtain the official Stylus extension yourself, unpack it, then set `STYLUS_EXTENSION_PATH` to that directory and run the command. The launcher uses Playwright's bundled Chromium, not your normal browser or profile, serves the local install/update URL only on `127.0.0.1`, and opens both that URL and `https://chatgpt.com`. Install/update the style and sign in manually. Revisit a long ChatGPT code block and scroll to confirm DOM drift has not affected the Copy control.

The isolated profile defaults to `.violet-void-dev-profile` and persists login and the locally installed style between runs; it is ignored by Git. To reset it, first close the dev browser, inspect that exact directory, then remove only `.violet-void-dev-profile`. Use `node scripts/dev-browser.js --help` for environment variables and `--dry-run` for extension/browser/path validation. The launcher neither downloads Stylus nor automates extension confirmation or credentials.
