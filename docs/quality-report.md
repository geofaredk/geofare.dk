# Quality report

Measured on 1 October 2026 against the "Quality bar" in `briefing.md`, on the Docker container built from this repository (nginx, gzip and cache headers as in production) and on the Astro preview server.

Result: every line of the quality bar is met. No change to the site itself was needed; the work went into the tests and measurements that prove it. The limits of what was verified are listed below.

## The quality bar, line by line

| Requirement | How it was measured | Result | Evidence |
| --- | --- | --- | --- |
| **Accessibility.** WCAG 2.2 AA, full keyboard use, visible focus, skip link, reduced motion, pause control | axe-core (WCAG 2.0 to 2.2, A and AA rules) at 360 and 1280 px with every sector open, with the menu open, and with the animation paused; a Tab walk through the whole page at 1280 and at 360 with the menu open, checking every stop for a ring and for not being hidden under the header; tests for the skip link, Escape on the menu, Enter on the sector rows, reduced motion and the pause button. All in Chrome, Firefox and WebKit. Lighthouse accessibility audit. | 0 axe violations. 18 Tab stops at 1280 and 16 at 360 (menu open), each with a 3 px ring. Reduced motion shows the final sentence and one still frame with no pause button. Pause stops all drawing. Lighthouse accessibility 100. | `tests/e2e/a11y.spec.ts`, `focus.spec.ts`, `header.spec.ts`, `hero.spec.ts`, `sectors.spec.ts`; focus rings: `docs/screenshots/focus-*.png` |
| **Contrast.** At least 4.5:1 everywhere, including over the animation and on the blue section | In the browser: every visible piece of text (117 to 122 per page state) and every list marker. For each one, the colour as drawn is measured against the colour behind it, at 360 and 1280: at rest, with the animation running, paused, with the menu open, and with each button and link hovered. 4.5:1 is required for all text, large or small. Separately, a test reads the canvas pixels behind every piece of hero text and every button during the whole headline rotation: no line is drawn behind them. | Lowest ratio found: **5.69:1** (blue on cream, and cream on the blue section). No text below that, in any of the three browsers. No line pixel behind any hero text or control. | `tests/e2e/contrast.spec.ts`, `tests/e2e/hero.spec.ts` ("no line sits behind text or controls") |
| **Performance.** Lighthouse 95+ in all four categories on mobile; under 50 KB JavaScript compressed; no layout shift when fonts load | `npm run lighthouse` against the container: Lighthouse 13.5, mobile emulation and throttling, three runs, median kept. Sizes measured from the container with gzip. Layout measured with Figtree and with the fallback face in all three browsers. | Median: **Performance 100, Accessibility 100, Best Practices 100, SEO 100.** Layout shift 0.000, first paint 1.08 s, largest paint 1.52 s, blocking time 0 ms. JavaScript **3.2 KB** compressed in total (two files); the animation file 2.8 KB compressed (5.8 KB raw), against a 15 KB budget. Page weight 63 KB transferred. | Command output below; `scripts/lighthouse.mjs` |
| **Privacy.** No cookies, no third-party requests, no font CDN, tag manager, embed or analytics | After loading the page, using the pause button, scrolling to the end, opening all seven sectors, visiting the privacy page and a missing page: cookies, `localStorage`, `sessionStorage` and every request URL are checked. The container's headers are checked for `Set-Cookie`. The Content Security Policy only allows the site's own files. | No cookies, nothing stored, 25 to 27 requests, all to the site's own address. Lighthouse lists one origin. No `Set-Cookie` header. | `tests/e2e/privacy.spec.ts`, `tests/e2e/smoke.spec.ts`, `tests/docker/smoke.sh` |
| **Responsive.** Works from 360 to 1920 px; checked at 360, 768, 1280, 1920 | Automated: no sideways scrolling and nothing past the right edge on every page at 320, 360, 768, 1280 and 1920 px; layout tests for the services grid, principles, About spread and sector rows. Full-page screenshots at all four widths, looked at one by one. | No overflow at any width. Layout as designed at all four widths. | `tests/e2e/layout.spec.ts`; `docs/screenshots/home-360.png`, `home-1280.png` |
| **Browsers.** Two latest versions of Chrome, Safari, Firefox, Edge | The whole browser test suite (106 tests) in three engines: Google Chrome 152 (installed), WebKit 26.6 (Playwright's build, the engine of Safari 26) and Firefox 155 (Playwright's build). Screenshots at 360 and 1280 in each. | 106 of 106 tests pass in each engine. Screenshots match. | `npm run test:e2e`; `docs/screenshots/browsers/` |
| **Copy.** Matches the brief word for word | Build tests compare the built HTML with the brief's copy, extracted to `tests/fixtures/copy.en.json`. The rendered page was also read once against the brief for order and punctuation. | 119 of 119 build tests pass. Order and punctuation match. Two points to note are listed under "Points in the brief". | `tests/build/copy.test.ts`, `seo.test.ts` |
| **Deployment.** Image builds from a clean checkout, starts with one command, answers on the published port | `npm run test:docker` builds the image from a clean `git archive` of the last commit, starts it with `docker compose up` and checks 47 things: pages, 404, gzip, cache headers, security headers, health check, non-root user, read-only filesystem. | All checks pass. Image 51 MB, runs as uid 101, healthy. | `tests/docker/smoke.sh` |

Screenshots (Chrome, animation paused): [360 px](screenshots/home-360.png), [1280 px](screenshots/home-1280.png). The same widths in WebKit and Firefox are in [screenshots/browsers](screenshots/browsers/).

### What was verified, and what was not

- **Browsers.** "Two latest versions" was checked with the current engines, not with every shipped browser. Chrome is the installed Google Chrome 152. Safari was checked with Playwright's WebKit 26.6, which is Safari's engine but not Safari itself. Firefox was checked with Playwright's Firefox 155 running on Linux in Docker, because that build does not start on this Mac (macOS 27). Edge is built on the same engine as Chrome and was not run separately. The previous version of each browser was not run.
- **Screen readers.** The accessibility tree was read in each engine, and Chrome's own tree was read through its debugging interface. VoiceOver, NVDA and JAWS were not run.
- **Contrast** covers text drawn by the page. The brief's own contrast table agrees with the measured 5.69:1 for blue on cream and cream on blue.
- **Lighthouse** ran 12 times in all on this machine. Eleven runs scored 100 for performance. The first run of the day scored 85, because of 0.6 s of blocking time, part of it outside the page's scripts. It did not happen again, and the median of every set of three runs was 100. A real phone was not used; Lighthouse emulates one.

## Budgets

| What | Raw | Sent (gzip) | Budget |
| --- | --- | --- | --- |
| All JavaScript (two files) | 6.5 KB | 3.2 KB | under 50 KB |
| Animation, headline and pause button (one file) | 5.8 KB | 2.8 KB | under 15 KB |
| Font (Figtree variable, Latin) | 19.7 KB | 19.7 KB (woff2) | |
| Home page HTML | 57.9 KB | 17.4 KB | |
| Stylesheets (two files) | 18.8 KB | 4.8 KB | |
| Whole page, as Lighthouse measures it | | 63.1 KB | |

The HTML is the largest file after the font because it contains the still line-field drawings (About picture, blue section, the band above Contact and the no-JavaScript hero). Lighthouse is not affected by this.

## Fixes made

No change to the site's code, styles or content was needed. Changes to the tests and tools:

- `playwright.config.ts`: tests run in Chrome, Firefox and WebKit. The test server is never reused, so an old build can never be tested by mistake, and `npm run test:e2e` builds the site first. `E2E_BASE_URL` points the tests at a running site, such as the container.
- New tests: `contrast.spec.ts`, `privacy.spec.ts`, `focus.spec.ts`.
- `header.spec.ts`: in WebKit the Tab walk uses Option+Tab. Safari leaves links out of the Tab order unless the reader turns on "Press Tab to highlight each item" or uses Option+Tab; that is how Safari works on every site.
- `hero.spec.ts`: one position check now allows a hundredth of a pixel, because Firefox rounds differently in the last digits.
- `smoke.spec.ts`: the "own origin" check uses the test address instead of `localhost`, so it also works against the container.
- New scripts: `scripts/lighthouse.mjs` (`npm run lighthouse`) and `scripts/screenshots.mjs`. `.lighthouse/` is ignored by git. README updated.

## Known limitations

1. **JavaScript on, but the script fails to load.** This is rare: the site's own scripts would have to fail to download. If it happens, on screens under 960 px the menu button is shown but does nothing, so the menu links cannot be reached; the page can still be scrolled, and the hero's "Get in touch" button still works. The headline shows its first ending ("when the future is uncertain."), and the pause button is shown but does nothing. Screen readers and search engines still get the full `h1` ("Make good decisions when it matters."). The cause is that the page decides from whether JavaScript is switched on, not from whether the script ran. The strict Content Security Policy rules out a small inline script that could make that check. A fix without JavaScript (the HTML `popover` attribute for the menu) is possible, but it changes how the menu is built and tested, so it was not made now.
2. **Sector rows in Safari and Firefox open without the growing animation.** Both browsers lack `interpolate-size`, so a row opens at once. That is the intended fallback.
3. **Firefox and focus near the bottom edge.** When Tab reaches a sector row that already shows a little at the bottom of the window, Firefox does not scroll it fully into view. The row and three sides of its ring are visible. Chrome and Safari scroll it fully into view. This is how Firefox works on every site.
4. **Firefox has no `text-wrap: pretty`**, so a paragraph can end on a single short word ("them."). The text is complete and nothing overlaps.
5. **Sector headings inside the open/close row.** Each sector name is an `h3` inside the row's `<summary>`. Chrome reports it as a disclosure control, with its open or closed state, named by the sector, containing a level-3 heading. So heading navigation and the open/close control both work. Playwright's snapshot shows the same structure in all three engines. How VoiceOver reads it in Safari was not tested with VoiceOver itself.

## Points in the brief

The copy was not changed. Two things to know:

- The page sets straight quotes and apostrophes as typographic ones: "what's" appears as "what’s", and the founder's quote appears in “curly” quotes. The words are the same.
- The brief says "Claims end with a full stop." The Contact claim, "Have a decision coming up?", is a question and ends with a question mark, as written in the brief.

## Observations (no change made)

- At 1280 px and wider, the hero has a large open band between the headline and the sub-line, where the line field is densest. It is intended, but on a short laptop screen the buttons sit low in the window ([1280 px](screenshots/home-1280.png)).
- Font swap: with the fallback face instead of Figtree, everything in the first screen (headline, sub-line, buttons) stands in exactly the same place in all three engines, so nothing moves when Figtree arrives; Lighthouse measures a layout shift of 0. Further down the page, at 360 px, the fallback runs a few lines longer (the Contact section starts 29 px lower in Chrome and Safari); that is out of view while the font loads.

## How to re-run each check

Use Node 22.12 or newer. Install the test browsers once with `npx playwright install firefox webkit`.

```sh
npm test                      # build + copy, SEO and output tests (Vitest)
npm run check                 # type check
npm run test:e2e              # build + all browser tests in Chrome, Firefox and WebKit
npm run test:e2e -- --project=chrome   # one browser only (chrome, firefox or webkit)
npm run test:docker           # clean-checkout image build and container checks (port 18080)

# Lighthouse and screenshots need a running container:
GEOFARE_PORT=8081 docker compose up -d --build
npm run lighthouse -- http://localhost:8081
node scripts/screenshots.mjs chrome http://localhost:8081 docs/screenshots

# Browser tests against the container instead of the preview server:
E2E_BASE_URL=http://localhost:8081 npx playwright test
```

Where Playwright's Firefox does not start (as on macOS 27 at the time of writing), run the Firefox tests in Playwright's Linux image against the container:

```sh
docker run --rm --ipc=host -v "$PWD":/work -w /work \
  -e E2E_BASE_URL=http://host.docker.internal:8081 \
  mcr.microsoft.com/playwright:v1.63.0-noble \
  node node_modules/@playwright/test/cli.js test --project=firefox --output=/tmp/results
```
