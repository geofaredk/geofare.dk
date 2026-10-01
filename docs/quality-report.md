# Quality report

Measured on 1 October 2026 against the "Quality bar" in `briefing.md`, on the Docker container built from this repository (nginx, gzip and cache headers as in production) and on the Astro preview server. The test results, font-swap figures and screenshots were measured again after the final round of fixes (see "Final review fixes"); Lighthouse and the sizes taken from a running container were not, and say so where they appear.

Result: every line of the quality bar is met in the measurements below, with these limits:

- **Browsers** were checked with the current engines only: installed Google Chrome, and Playwright's builds of WebKit (Safari's engine) and Firefox. Real Safari, Edge and the previous version of each browser were not run.
- **Font loading.** In normal loading, Lighthouse (Chrome, emulated phone) measured no layout shift; normal loading in the other engines was not measured. When the web font is held back on purpose until the page has been drawn, nothing on the first screen moves up or down in Chrome, Firefox and Safari's engine, but a few items move 1.4 to 6.5 px sideways (Chrome's layout-shift score 0.0002).

Two small changes to the site were made in the first round, both for the font fallback (see Fixes made). The final review fixes are listed under "Final review fixes".

## The quality bar, line by line

| Requirement | How it was measured | Result | Evidence |
| --- | --- | --- | --- |
| **Accessibility.** WCAG 2.2 AA, full keyboard use, visible focus, skip link, reduced motion, pause control | axe-core (WCAG 2.0 to 2.2, A and AA rules) at 360 and 1280 px with every sector open, with the menu open, and with the animation paused; a Tab walk through the whole page at 1280 and at 360 with the menu open, checking every stop for a ring, the ring's contrast against what it is drawn on (3:1 needed), and that it is not hidden under the header; tests for the skip link, Escape on the menu, Enter on the sector rows, reduced motion and the pause button; in forced colours (Windows High Contrast, emulated), the sector plus and minus and the contact rules are painted in a colour other than the page's. All in Chrome, Firefox and WebKit. Lighthouse accessibility audit. | 0 axe violations. Sector signs and contact rules visible in forced colours. 18 Tab stops at 1280 and 16 at 360 (menu open), each with a 3 px ring; lowest ring contrast 5.69:1. Nothing in the blue section takes focus. Reduced motion shows the final sentence and one still frame with no pause button. Pause stops all drawing. Lighthouse accessibility 100. | `tests/e2e/a11y.spec.ts`, `focus.spec.ts`, `forced-colors.spec.ts`, `header.spec.ts`, `hero.spec.ts`, `sectors.spec.ts`; focus rings: `docs/screenshots/focus-*.png` |
| **Contrast.** At least 4.5:1 everywhere, including over the animation and on the blue section | In the browser: every visible piece of text (117 to 122 per page state) and every list marker. For each one, the colour as drawn is measured against the colour behind it, at 360 and 1280: at rest, with the animation running, paused, with the menu open, and with each button and link hovered. 4.5:1 is required for all text, large or small. Separately, a test reads the canvas pixels behind every piece of hero text and every button during the whole headline rotation: no line is drawn behind them. | Lowest ratio found: **5.69:1** (blue on cream, and cream on the blue section). No text below that, in any of the three browsers. No line pixel behind any hero text or control. | `tests/e2e/contrast.spec.ts`, `tests/e2e/hero.spec.ts` ("no line sits behind text or controls") |
| **Performance.** Lighthouse 95+ in all four categories on mobile; under 50 KB JavaScript compressed; no layout shift when fonts load | `npm run lighthouse` against the container: Lighthouse 13.5.0 (pinned), mobile emulation and throttling, three runs, median kept. Sizes measured from the container with gzip (recipe below). Font swap: a test holds the web font back until the page has been drawn with the fallback face, then lets it through, and compares every box on the first screen; in Chrome it also reads Chrome's own layout-shift score. | Median: **Performance 100, Accessibility 100, Best Practices 100, SEO 100.** Layout shift 0.000, first paint 1.12 s, largest paint 1.57 s, blocking time 0 ms. JavaScript **3.2 KB** compressed in total (two files); the animation file 2.8 KB compressed (5.8 KB raw), against a 15 KB budget. Page weight 63 KB transferred. (Lighthouse and page weight were measured before the final review fixes, at commit b94f449; the JavaScript has not changed since, the HTML has grown by about 6 KB sent, see Budgets.) Font held back, all three engines: nothing moves up or down; the second hero button moves 1.4 to 1.7 px sideways, and at 960 px and wider the right-aligned menu up to 6.5 px (Chrome 6.5, WebKit 6.3, Firefox 6.2); Chrome's layout-shift score 0.0000 at 360 and 0.0002 at 1280. | `scripts/lighthouse.mjs`; `tests/e2e/fonts.spec.ts` |
| **Privacy.** No cookies, no third-party requests, no font CDN, tag manager, embed or analytics | After loading the page, using the pause button, scrolling to the end, opening all seven sectors, visiting the privacy page and a missing page: cookies, `localStorage`, `sessionStorage` and every request URL are checked. The container's headers are checked for `Set-Cookie`. The Content Security Policy only allows the site's own files. | No cookies, nothing stored, 25 to 27 requests, all to the site's own address. Lighthouse lists one origin. No `Set-Cookie` header. | `tests/e2e/privacy.spec.ts`, `tests/e2e/smoke.spec.ts`, `tests/docker/smoke.sh` |
| **Responsive.** Works from 360 to 1920 px; checked at 360, 768, 1280, 1920 | Automated: no sideways scrolling and nothing past the right edge on every page at 320, 360, 768, 1280 and 1920 px; layout tests for the services grid, principles, About spread and sector rows. The still line-field drawings (About picture, blue section, band above Contact) are checked to be drawn at the hero's scale, one unit to one CSS pixel, at 360, 768, 1280 and 1920. Full-page screenshots at all four widths, looked at one by one. | No overflow at any width. Layout as designed at all four widths. Still line fields at scale 1 at all four widths. | `tests/e2e/layout.spec.ts`; `docs/screenshots/home-360.png`, `home-1280.png` |
| **Browsers.** Two latest versions of Chrome, Safari, Firefox, Edge | The whole browser test suite (114 tests) in three engines: Google Chrome 152 (installed) and WebKit 26.6 (Playwright's build, the engine of Safari 26) with `npm run test:e2e`; Firefox 155 (Playwright's build, on Linux in Docker) with `npm run test:e2e:firefox:docker`, because Playwright's Firefox does not start on macOS 27. Screenshots at 360 and 1280 in each. Real Safari, Edge and previous versions were not run. | Chrome and WebKit: 114 of 114 pass. Firefox: 114 of 114 pass, with the same expectations as the other engines (the repository mounted read-only into the test container). Screenshots match. The Firefox comparison screenshots in `docs/screenshots/browsers/` are from before the final review fixes, because Firefox does not start on this Mac; they differ from the current page only in the line-field drawings below the blue section, above Contact and in the About picture. | `npm run test:e2e`, `npm run test:e2e:firefox:docker`; `docs/screenshots/browsers/` |
| **Copy.** Matches the brief word for word | Build tests compare the built HTML with the brief's copy, extracted to `tests/fixtures/copy.en.json`. The rendered page was also read once against the brief for order and punctuation. | 135 of 135 Vitest tests pass (35 on the built HTML, 100 unit tests). Order and punctuation match. A placeholder may be filled in without a test change. Two points to note are listed under "Points in the brief". | `tests/build/copy.test.ts`, `seo.test.ts` |
| **Deployment.** Image builds from a clean checkout, starts with one command, answers on the published port | `npm run test:docker` builds the image from a clean `git archive` of the last commit, starts it with `docker compose up` and checks 47 things: pages, 404, gzip, cache headers, security headers, health check, non-root user, read-only filesystem. | All checks pass. Image 51 MB, runs as uid 101, healthy. | `tests/docker/smoke.sh` |

Screenshots (Chrome, animation paused): [360 px](screenshots/home-360.png), [1280 px](screenshots/home-1280.png). The same widths in WebKit and Firefox are in [screenshots/browsers](screenshots/browsers/).

### What was verified, and what was not

- **Browsers.** "Two latest versions" was checked with the current engines, not with every shipped browser. Chrome is the installed Google Chrome 152. Safari was checked with Playwright's WebKit 26.6, which is Safari's engine but not Safari itself. Firefox was checked with Playwright's Firefox 155 running on Linux in Docker, because that build stops at start-up on this Mac (macOS 27) with "Could not find profile folder."; the exact command is `npm run test:e2e:firefox:docker`. Edge is built on the same engine as Chrome and was not run separately. The previous version of each browser was not run.
- **Screen readers.** Only Chrome's own accessibility tree was read (through its debugging interface). For WebKit and Firefox only Playwright's own snapshot was taken, which Playwright computes itself rather than reading from the browser, so it says nothing about what Safari or Firefox expose. VoiceOver, NVDA and JAWS were not run.
- **Contrast** covers text drawn by the page. The brief's own contrast table agrees with the measured 5.69:1 for blue on cream and cream on blue.
- **Lighthouse** ran 15 times in all on this machine. Fourteen runs scored 100 for performance. The first run of the day scored 85, because of 0.6 s of blocking time, part of it outside the page's scripts. It did not happen again, and the median of every set of three runs was 100. A real phone was not used; Lighthouse emulates one.

## Budgets

| What | Raw | Sent (gzip) | Budget |
| --- | --- | --- | --- |
| All JavaScript (two files) | 6.5 KB | 3.2 KB | under 50 KB |
| Animation, headline and pause button (one file) | 5.8 KB | 2.8 KB | under 15 KB |
| Font (Figtree variable, Latin) | 19.7 KB | 19.7 KB (woff2) | |
| Home page HTML | 74.3 KB | 24.0 KB * | |
| Stylesheets (two files) | 20.5 KB | 5.2 KB * | |
| Whole page, as Lighthouse measures it | | 63.2 KB (at b94f449) | |

\* Measured from `dist/` with `gzip -6`, nginx's level, after the final review fixes; the other rows were measured from the container at b94f449 and those files have not changed.

The HTML is the largest file because it contains the still line-field drawings (About picture, blue section, the band above Contact and the no-JavaScript hero). The two bands are now drawn 2560 px wide at the hero's scale and cropped, instead of 1440 px wide and scaled to the screen, which added about 6 KB sent.

To measure the sizes again, with the container running on port 8081:

```sh
B=http://localhost:8081
for p in / $(curl -s $B/ | grep -oE '/_astro/[^"]+\.(js|css|woff2)' | sort -u); do
  echo "$p raw $(curl -s $B$p | wc -c) sent $(curl -s -H 'Accept-Encoding: gzip' $B$p | wc -c)"
done
```

## Fixes made

To the site (both in the fallback font, so the page holds still while Figtree loads; the design is unchanged):

- `src/styles/fonts.css`: the fallback was one face, Arial scaled by 101.42% for every weight. A held-back font showed that it was too wide for headlines (Arial has no semibold, so the browser used Arial Bold): in Safari's engine at 360 px the headline took an extra line. Now there is one fallback face per weight the site uses, each scaled to Figtree: Arial 100.31% (400), Arial 102.19% (500), Arial Bold 95.02% (600). Liberation Sans, which has Arial's widths and is on most Linux systems, is listed after Arial.
- `src/components/sections/Hero.astro`: the sub-line's width was 38ch. `ch` is the width of the digit 0, which differs between the fallback and Figtree, so the line was 64 px narrower until Figtree arrived and its words rewrapped. It is now 24.35em, the same width with Figtree, whatever font is drawing.

To the tests and tools:

- `playwright.config.ts`: Chrome, Firefox and WebKit projects. The test server is never reused, and `npm run test:e2e` always rebuilds the site first. `E2E_BASE_URL` points the tests at a running site, such as the container.
- `npm run test:e2e` runs Chrome and WebKit. `npm run test:e2e:firefox` runs Firefox where Playwright's Firefox starts; `npm run test:e2e:firefox:docker` (`tests/docker/e2e-firefox.sh`) runs it in Playwright's Linux image against a container of its own.
- New tests: `contrast.spec.ts`, `privacy.spec.ts`, `focus.spec.ts`, `fonts.spec.ts`.
- `header.spec.ts`: in WebKit the Tab walk uses Option+Tab. Safari leaves links out of the Tab order unless the reader turns on "Press Tab to highlight each item" or uses Option+Tab; that is how Safari works on every site.
- `hero.spec.ts`: one position check now allows a hundredth of a pixel, because Firefox rounds differently in the last digits.
- `smoke.spec.ts`: the "own origin" check uses the test address instead of `localhost`, so it also works against the container.
- New scripts: `scripts/lighthouse.mjs` (`npm run lighthouse`, Lighthouse pinned to 13.5.0) and `scripts/screenshots.mjs` (page and focus-ring screenshots). `.lighthouse/` is ignored by git. README updated.

## Final review fixes

- **Content checks** (`src/lib/content-rules.ts`, `src/content.config.ts`): the build stops, naming the file, on a misspelt front-matter key in a section file, a missing title where the section shows one, an empty text where the section shows one, or two services, sectors or principles of one language with the same `order` or `slug`.
- **Copy tests** accept a filled-in placeholder; the sector test reads the names from the brief's fixture.
- **Firefox font swap** (`src/styles/fonts.css`): three hidden letters (pseudo-elements with empty alternative text) set in "Figtree Fallback" at 400, 500 and 600 make Firefox load the fallback faces from the start, so it uses them while Figtree loads. Measured on Linux Firefox 155 with the font held back: the menu moves 6.2 px sideways at most, where it moved 33 px; nothing moves up or down. The same test (without the fix, with the same warm-up) still shows 33 px, so the fix is what removes it.
- **Forced colours:** the sector plus and minus and the contact rules use system colours there.
- **Structured data:** no `areaServed` (the brief gives none); street, postcode and town once they are real.
- **Still line fields** at the hero's scale on every screen width.
- **Headers:** `interest-cohort=()` removed from `Permissions-Policy`.
- **Tools:** `.nvmrc` names Node 24, as the Docker build; the brand-asset script uses `fileURLToPath`; the locale helpers are tested with a Danish locale.

## Known limitations

1. **JavaScript on, but the script fails to load.** This is rare: the site's own scripts would have to fail to download. If it happens, on screens under 960 px the menu button is shown but does nothing, so the menu links cannot be reached; the page can still be scrolled, and the hero's "Get in touch" button still works. The headline shows its first ending ("when the future is uncertain."), and the pause button is shown but does nothing. Screen readers and search engines still get the full `h1` ("Make good decisions when it matters."). The cause is that the stylesheet decides from whether JavaScript is switched on, not from whether the script ran. Fixing it means rebuilding the menu so it opens without the script, for example with the HTML `popover` attribute; that was not attempted in this round.
2. **Sector rows in Safari and Firefox open without the growing animation.** Both browsers lack `interpolate-size`, so a row opens at once. That is the intended fallback.
3. **Firefox and focus near the bottom edge.** When Tab reaches a sector row that already shows a little at the bottom of the window, Firefox does not scroll it fully into view. The row and three sides of its ring are visible. Chrome and Safari scroll it fully into view. This is how Firefox works on every site.
4. **Firefox has no `text-wrap: pretty`**, so a paragraph can end on a single short word ("them."). The text is complete and nothing overlaps.
5. **Sector headings inside the open/close row.** Each sector name is an `h3` inside the row's `<summary>`. In Chrome this works: Chrome reports a disclosure control, with its open or closed state, named by the sector, containing a level-3 heading, so heading navigation and the open/close control both work. In Safari and Firefox it was not verified. Before launch, check it in Safari with VoiceOver: open the rotor (VO+U), choose Headings, and confirm the seven sector names are listed and that each row announces as collapsed or expanded.
6. **Firefox just after it starts.** In the test container, a Firefox that had just started sometimes rebuilt its font list in the middle of its first page load (seen in 1 of about 3 fresh starts) and then drew that page in its default sans-serif, so a late Figtree moved the first screen as it did without the fix (seen at 360 px: the menu button 1.4 px sideways, the first service text one line taller). `fonts.spec.ts` therefore lets the browser settle on a page of plain text for one second before it measures; with that, 20 of 20 repeated runs kept to the numbers above. It was not seen once the browser had settled. Firefox on Mac and Windows was not measured. Removing all sideways movement in every browser would need `font-display: optional`, at the price that a visitor on a slow first visit sees the fallback instead of Figtree for that visit; that brand decision was not needed for this fix and was not made.

## Points in the brief

The copy was not changed. Two things to know:

- The page sets straight quotes and apostrophes as typographic ones: "what's" appears as "what’s", and the founder's quote appears in “curly” quotes. The words are the same.
- The brief says "Claims end with a full stop." The Contact claim, "Have a decision coming up?", is a question and ends with a question mark, as written in the brief.

## Observations (no change made)

- At 1280 px and wider, the hero has a large open band between the headline and the sub-line, where the line field is densest. It is intended, but on a short laptop screen the buttons sit low in the window ([1280 px](screenshots/home-1280.png)).
- The contact rows show no focus ring today because, while they hold the placeholders `[email address]` and `[LinkedIn URL]`, they are plain text and cannot take focus. [focus-contact-block-sample.png](screenshots/focus-contact-block-sample.png) shows the focus state a real address will get: for that one screenshot the placeholder was swapped in the browser for `name@example.com`.

## How to re-run each check

Use Node 22.12 or newer. Install the test browsers once with `npx playwright install firefox webkit`.

```sh
npm test                          # build + copy, SEO and output tests (Vitest)
npm run check                     # type check
npm run test:e2e                  # always rebuilds, then all browser tests in Chrome and WebKit
npm run test:e2e:firefox          # the same in Firefox, where Playwright's Firefox starts
npm run test:e2e:firefox:docker   # Firefox in Playwright's Linux image (needs Docker; port 18082, or set E2E_PORT)
npm run test:docker               # clean-checkout image build and container checks (port 18080)
```

`npm run test:e2e:firefox:docker` starts its own container (compose project `geofare-e2e`, image `geofare-website-e2e`) and removes it afterwards. It pulls Playwright's image (`mcr.microsoft.com/playwright:v1.63.0-noble`, about 2.5 GB) on first use and leaves it in place; remove it with `docker image rm mcr.microsoft.com/playwright:v1.63.0-noble` when no longer needed.

Lighthouse, screenshots and the size recipe above need a running container. Start one under its own project name and image tag, so it can never touch a real `geofare` deployment on the same machine, on a port that is free (8081 here):

```sh
GEOFARE_IMAGE=geofare-website-qa GEOFARE_PORT=8081 docker compose -p geofare-qa up -d --build --wait

npm run lighthouse -- http://localhost:8081
node scripts/screenshots.mjs page chrome http://localhost:8081 docs/screenshots               # 360 and 1280
node scripts/screenshots.mjs page webkit http://localhost:8081 /tmp/shots 360,768,1280,1920   # other engines and widths
node scripts/screenshots.mjs focus http://localhost:8081 docs/screenshots                     # focus-ring close-ups
E2E_BASE_URL=http://localhost:8081 npx playwright test --project=chrome                       # browser tests against it

# Afterwards, remove exactly what was started:
GEOFARE_IMAGE=geofare-website-qa GEOFARE_PORT=8081 docker compose -p geofare-qa down
docker image rm geofare-website-qa
```
