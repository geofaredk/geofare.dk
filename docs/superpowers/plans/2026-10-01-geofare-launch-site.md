# geofare Launch Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the single-page geofare marketing site described in `briefing.md` as a static Astro build served from an nginx Docker container, meeting every line of the brief's quality bar.

**Architecture:** Astro static output. All copy lives in per-language Markdown/YAML under `src/content/`; each page section is one component; `src/components/pages/Home.astro` only composes them, so a Danish home page is a one-line route file plus content. One pure geometry module (`src/lib/linefield.ts`) generates the logo-derived line field and feeds both the animated hero canvas and the static SVG crops, so the hero, the dividers and the no-JS fallback are literally the same drawing.

**Tech Stack:** Astro 7 (static), TypeScript strict, plain CSS with custom properties, Figtree variable font self-hosted (woff2), Vitest (built-output tests), Playwright + axe (browser tests, `channel: 'chrome'`), nginx-unprivileged in Docker.

**Spec:** `briefing.md` (repo root). It is the binding authority. Read it in full before starting any task.

## Global Constraints

Copied from the brief. Every task's requirements include these.

- **Copy:** used word for word, British English. "If a line does not fit a layout, change the layout, not the line." The machine-readable copy is `tests/fixtures/copy.en.json` (extracted from the brief by script). Never edit that fixture to make a test pass.
- **Placeholders:** values in square brackets (`[surname]`, `[email address]`, `[LinkedIn URL]`, `[street address]`, `[postcode and town]`, `[number]`) stay visible. Do not invent values. (`[year]` is the build year.)
- **Palette:** `--bg #FCF2EB`, `--accent #0047FF`, `--ink #0B1220`, `--on-accent #FCF2EB`. Defined once as CSS custom properties; every tint derived from them with `color-mix()`. No other hues. No hex colour literal outside `src/styles/tokens.css` (canvas/SVG read the tokens).
- **Avoid:** gradients, drop shadows, glass effects, stock icon sets, carousels, decorative illustrations, stock/people photos, boxes/cards with shadows.
- **Type:** Figtree only (one family), weights 400 / 500 / 600, self-hosted woff2, no font CDN. Headlines in sentence case. Hero headline `clamp(2.75rem, 7vw, 6rem)`, section claims `clamp(2rem, 4.5vw, 3.75rem)`, body `1.125rem` / line-height 1.6.
- **Logo:** `brand-with-name.svg` in header and footer, `brand.svg` for favicon / share image / small sizes. Never redrawn, recoloured or distorted. In running text the name is lowercase: geofare.
- **Accessibility:** WCAG 2.2 AA. Full keyboard use, visible focus, skip link, reduced-motion support, pause control. Text contrast ≥ 4.5:1 everywhere, including over the animation and on the blue section. One `h1`, logical heading order.
- **Performance:** Lighthouse ≥ 95 in all four categories on mobile. < 50 KB JavaScript compressed in total; animation module < 15 KB. No layout shift when fonts load.
- **Privacy:** no cookies, no third-party requests, no analytics, no font CDN, no embeds.
- **Responsive:** 360 px to 1920 px; checked at 360, 768, 1280, 1920.
- **Browsers:** two latest versions of Chrome, Safari, Firefox, Edge. (`color-mix()`, `@media (scripting)`, `<details>`, CSS nesting are all fine.)
- **CSP-clean output:** the nginx config will send `script-src 'self'; style-src 'self'`. So: no inline `<script>` with code (JSON-LD data blocks are fine), no `style=""` attributes, no inline `<style>`; Astro is configured to emit external files only. Setting styles through the CSSOM from JS is allowed.
- **Content separate from layout:** no user-facing string in a component, layout or script. Copy comes from `src/content/**`, company data from `src/config/site.ts`.

### Environment (applies to every task)

- Run every command with the Homebrew Node first on PATH: `export PATH=/opt/homebrew/bin:$PATH` (Node 25.6.1). The default `node` is 22.11, too old for Astro 7 (needs ≥ 22.12).
- Astro is **7.x**, newer than most training data. Before using an Astro API (content collections, loaders, i18n, `astro:assets`, script handling), check the installed version's docs at https://docs.astro.build or the types in `node_modules/astro`. Do not write Astro 4/5 idioms from memory without checking.
- Git: work on the existing branch `launch-site`. Commit after each green step. End every commit message with the line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Never push, never touch `main`, never edit `briefing.md` or `tests/fixtures/copy.en.json`.
- Browser tests use the system Chrome (`channel: 'chrome'`); do not download Chromium.
- Visual work is judged by looking: take screenshots (Playwright, system Chrome) at 360 and 1280 px and read them before reporting.

## Design System (binding for Tasks 1–4)

Design direction in one line: **a hydrologist's field sheet, not a consultancy brochure** — cream paper, one confident blue, very large quiet type, and the logo's wave bands drifting behind it as contour lines. Boldness is spent in exactly one place: the hero line field. Everything else is type and space.

### Tokens — `src/styles/tokens.css` (complete file)

```css
:root {
  /* Brand: the only colour literals in the project */
  --bg: #FCF2EB;
  --accent: #0047FF;
  --ink: #0B1220;
  --on-accent: #FCF2EB;

  /* Derived tints */
  --ink-muted: color-mix(in srgb, var(--ink) 78%, var(--bg));
  --rule: color-mix(in srgb, var(--ink) 18%, var(--bg));
  --rule-accent: color-mix(in srgb, var(--accent) 35%, var(--bg));
  --rule-on-accent: color-mix(in srgb, var(--on-accent) 40%, var(--accent));
  --field-line: var(--accent);        /* drawn at --field-opacity */
  --field-opacity: 0.16;              /* brief: 10 to 20 percent */

  /* Type */
  --font-sans: "Figtree", "Figtree Fallback", system-ui, sans-serif;
  --step-hero: clamp(2.75rem, 7vw, 6rem);
  --step-claim: clamp(2rem, 4.5vw, 3.75rem);
  --step-claim-s: clamp(1.75rem, 3.2vw, 2.75rem);
  --step-title: clamp(1.375rem, 2vw, 1.75rem);
  --step-lead: clamp(1.25rem, 1.6vw, 1.5rem);
  --step-body: 1.125rem;
  --step-small: 0.9375rem;
  --leading-hero: 1.02;
  --leading-claim: 1.1;
  --leading-body: 1.6;
  --tracking-hero: -0.025em;
  --tracking-claim: -0.02em;
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;

  /* Space and shape */
  --gutter: clamp(1.25rem, 5.5vw, 5rem);
  --content-max: 86rem;
  --section-space: clamp(5rem, 11vw, 10rem);
  --measure: 62ch;
  --radius: 4px;
  --header-h: 4.5rem;
  --focus-ring: 3px solid var(--accent);
}
```

### Rules of the system

- **Colour roles:** headlines, claims, links, buttons in `--accent`; body in `--ink`; secondary text in `--ink-muted`. On the blue section everything is `--on-accent`.
- **Hierarchy without labels:** no eyebrow labels, no all-caps, no letter-spaced caps. Every section has exactly one `h2`. Where the brief gives a claim (About, Who we work with, Contact) the claim *is* the `h2` at `--step-claim`. Where it gives none (Services, How we work) the `h2` is the section name from the content file, set at `--step-lead`, weight 500, in accent — a quiet signpost, not a banner.
- **Left-aligned** throughout, on a 12-column grid inside `--content-max` with `--gutter` side padding. Sections are separated by `--section-space`, never by boxes.
- **Hairlines carry meaning only:** used for the openable sector rows and the footer top edge. Nowhere else.
- **Buttons:** rectangular, `--radius`, min-height 3rem, weight 500. Primary: accent fill, `--on-accent` text; hover/active: `--ink` fill. Secondary: 1.5px accent outline, accent text; hover: accent fill, `--on-accent` text. No arrows, no icons.
- **Tags (pills):** `--step-small`, 1px `--rule-accent` border, fully rounded, `--ink` text, no fill. Not interactive, so no hover.
- **Focus:** `:focus-visible { outline: var(--focus-ring); outline-offset: 3px; }`; on the blue section the ring is `--on-accent`. `html { scroll-padding-top: calc(var(--header-h) + 1rem); }` so focus and anchors are never hidden under the sticky header.
- **Motion budget:** the hero line field and the hero headline rotation are the only motion that starts by itself. No scroll-reveal, no parallax. Hover/focus transitions ≤ 150 ms on colour only. `scroll-behavior: smooth` only under `prefers-reduced-motion: no-preference`.
- **Line graphics:** only ever produced by `src/lib/linefield.ts`. Used in four places: hero (animated), About portrait slot (static crop, replaced by the photo later), bottom edge of the blue section (static crop in `--on-accent`), one band above Contact (static crop). Never behind running text.

### Wireframes (1280 px; mobile stacks in the same order)

```
HEADER (sticky, cream, --header-h)
[mark GEOFARE DANMARK]          Services  About  How we work  Who we work with  [Get in touch]

HERO  #top  (min-height: 100svh - header)                         full-bleed line field behind,
  Make good decisions                                             erased softly behind all text
  when rivers overflow.          <- ending slot reserves the
                                    height of the tallest ending
        ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
     ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
  We turn satellite data, GIS and hydraulic
  modelling into risk information you can act on. …
  [Get in touch] [See what we do]                              [|| Pause animation]

SERVICES  #services
  Services
  01                                   02
  See what's there.                    Know what's coming.
  We use satellite observations …      We model how water …
  (pill) (pill) (pill)                 (pill) (pill)

  03                                   04
  Decide what comes first.             Make risk make sense.
  …                                    …

ABOUT  #about
  Safer communities start with
  risk people understand.                       (h2, --step-claim)
                         geofare specialises in flood risk management … (--step-lead)

  [ portrait slot 4:5  ]   Founder-led. Hands-on.            (h3)
  [ line-field crop    ]   geofare was founded by Niklas [surname], …
  [ until photo exists ]

      "Too much good hazard science never reaches the people who
       have to decide. I started geofare to change that."     (set apart, --step-claim-s, accent)

                           A team built around your project.  (h3)
                           You get Niklas, not an account manager. …

HOW WE WORK  #approach   (full-bleed --accent, text --on-accent)
  How we work
  Start small.       Open by default.    Yours to keep.     No layers.
  A first answer …   Open data and …     You get the data … You talk to …
  ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ line-field crop in --on-accent along the bottom edge ~ ~ ~ ~ ~

WHO WE WORK WITH  #sectors
  Different sectors. Same question.            (h2, --step-claim)
  A municipality, a grid operator and a bank …  (--step-lead, --measure)
  ───────────────────────────────────────────────────────────────
  Municipalities                                                +
  ───────────────────────────────────────────────────────────────
  Emergency management                                          –
     You need to know what is coming, …      • Scenarios you can plan and train with
                                             • Warnings people understand and act on
                                             • Maps and dashboards that work in …
  ───────────────────────────────────────────────────────────────
  … seven rows

  ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ line-field band ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
CONTACT  #contact
  Have a decision coming up?                   (h2, --step-claim)
  Tell us what you need to know. We will tell you what it takes to find out.
  [email address]                              (large link blocks, full row, thick underline;
  [LinkedIn URL]                                hover inverts the block to accent fill)

FOOTER (hairline top, --step-small)
  [mark GEOFARE DANMARK]   geofare, [street address], [postcode and town], Denmark. CVR [number].
                           Privacy.   © 2026 geofare.
```

## File Structure

```
astro.config.mjs            site URL, i18n, sitemap, external-only assets
package.json  tsconfig.json  vitest.config.ts  playwright.config.ts  .nvmrc
Dockerfile  compose.yaml  .dockerignore  docker/nginx.conf  README.md       (Task 5)
public/                     favicon.svg, favicon-32.png, apple-touch-icon.png, og-image.png
scripts/generate-brand-assets.mjs   builds the PNGs above from src/assets/brand.svg
src/
  assets/brand.svg  brand-with-name.svg  (moved from repo root)  fonts via @fontsource-variable/figtree
  config/site.ts            name, url, locales, company data (placeholders)
  config/navigation.ts      the one nav config
  content.config.ts         collection schemas
  content/
    services/en/*.md        4 entries     (title, order, slug, tags; body)
    sectors/en/*.md         7 entries     (title, order, slug; body = sentence + bullets)
    principles/en/*.md      4 entries     (title, order, slug; body)
    sections/en/*.md        hero, services, about-mission, about-founder, about-quote,
                            about-team, approach, sectors, contact, privacy, not-found
    ui/en.yaml              every interface string + page metadata
  lib/i18n.ts               locale helpers        lib/content.ts   typed per-language getters
  lib/contact.ts            placeholder-aware link helper
  lib/linefield.ts          pure line-field geometry                           (Task 2)
  components/LineField.astro  static SVG crop of the field                     (Task 2)
  components/Button.astro  Tag.astro  Logo.astro
  components/sections/Header.astro Hero.astro Services.astro About.astro
                      Approach.astro Sectors.astro Contact.astro Footer.astro
  components/pages/Home.astro   composes the sections for one language
  layouts/Base.astro        html/head/metadata/skip link/header/main/footer
  pages/index.astro  privacy.astro  404.astro  robots.txt.ts
  scripts/hero-field.ts     canvas driver (Task 2)   hero-rotator.ts  hero.ts  menu.ts (Task 3)
  styles/tokens.css  fonts.css  base.css
tests/
  fixtures/copy.en.json     the brief's copy (exists; read-only)
  build/*.test.ts           Vitest, runs against dist/
  unit/*.test.ts            Vitest, pure modules
  e2e/*.spec.ts             Playwright against `astro preview`
  docker/smoke.sh           container checks (Task 5)
```

## Review Focus

Failure modes the brief implies but does not spell out. Each is pinned by a test in the task named.

1. **A long hero ending wraps** ("when the future is uncertain." cannot fit one line at any width). Expected: nothing below the headline moves during the rotation and no text overlaps. → Task 3, `hero.spec.ts` "rotation causes no layout movement" at 360 and 1280.
2. **JavaScript is off or fails.** Expected: complete `h1`, every sector's text readable, navigation reachable on mobile, static line field shown. → Task 1 `copy.test.ts` (text in HTML), Task 3/4 `nojs.spec.ts`.
3. **Reduced motion.** Expected: final headline at once, one static field frame, no animation loop, no pause button for motion that does not exist. → Task 3 `hero.spec.ts` "reduced motion".
4. **Narrow or zoomed viewport** (320 CSS px = 1280 px at 400 % zoom, WCAG 1.4.10). Expected: no horizontal scrolling, no clipped text, at 320, 360, 768, 1280, 1920. → Task 4 `layout.spec.ts`.
5. **A placeholder is replaced by a real value.** Expected: `[email address]` → a working `mailto:` link, `[LinkedIn URL]` → an external link, JSON-LD gains the fields; while placeholders remain, no broken `href` and no placeholder leaks into JSON-LD. → Task 1 `contact.test.ts`, `seo.test.ts`.

---

### Task 1: Foundation — project, content, semantics, metadata

Delivers a building Astro site whose single page already contains every section with the brief's exact copy in semantic, lightly styled HTML, plus all metadata. Later tasks design on top of it without touching content wiring.

**Files:**
- Create: `package.json`, `.nvmrc`, `tsconfig.json`, `astro.config.mjs`, `vitest.config.ts`, `playwright.config.ts`
- Create: `src/config/site.ts`, `src/config/navigation.ts`, `src/content.config.ts`, all of `src/content/**`
- Create: `src/lib/i18n.ts`, `src/lib/content.ts`, `src/lib/contact.ts`
- Create: `src/styles/tokens.css` (verbatim from Design System), `src/styles/fonts.css`, `src/styles/base.css`
- Create: `src/layouts/Base.astro`, `src/components/pages/Home.astro`, `src/components/Logo.astro`, `src/components/sections/*.astro` (all eight), `src/pages/index.astro`, `src/pages/privacy.astro`, `src/pages/404.astro`, `src/pages/robots.txt.ts`
- Create: `scripts/generate-brand-assets.mjs`, `public/favicon.svg`, `public/favicon-32.png`, `public/apple-touch-icon.png`, `public/og-image.png`
- Move (`git mv`): `brand.svg`, `brand-with-name.svg` → `src/assets/`
- Test: `tests/build/copy.test.ts`, `tests/build/seo.test.ts`, `tests/build/output.test.ts`, `tests/unit/contact.test.ts`, `tests/unit/i18n.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `briefing.md`, `tests/fixtures/copy.en.json`.
- Produces (later tasks rely on these exact names):
  - npm scripts: `dev`, `build`, `preview` (port 4321), `check` (`astro check`), `test` (`astro build && vitest run`), `test:e2e` (`playwright test`, which starts `astro preview` itself via `webServer`).
  - `src/config/site.ts`:
    ```ts
    export type Lang = 'en';                    // 'da' is added here later
    export const site = {
      name: 'geofare',
      // Open point in the brief: the real domain is not known yet. Override with SITE_URL at build time.
      url: process.env.SITE_URL ?? 'https://geofare.example',
      defaultLang: 'en' as Lang,
      locales: { en: { path: '/', htmlLang: 'en-GB', hreflang: 'en' } } as Record<Lang, { path: string; htmlLang: string; hreflang: string }>,
      company: {
        street: '[street address]',
        postalTown: '[postcode and town]',
        cvr: '[number]',
        email: '[email address]',
        linkedin: '[LinkedIn URL]',
      },
    };
    ```
  - `src/config/navigation.ts`:
    ```ts
    export interface NavItem { id: 'services' | 'about' | 'approach' | 'sectors'; href: string }
    // hrefs are site-relative; an anchor becomes a page link later by changing one string
    export const mainNav: NavItem[] = [
      { id: 'services', href: '/#services' },
      { id: 'about', href: '/#about' },
      { id: 'approach', href: '/#approach' },
      { id: 'sectors', href: '/#sectors' },
    ];
    export const contactCta = { id: 'contact', href: '/#contact' } as const;
    // Planned routes, not built yet: /services/[slug], /sectors/[slug], /projects, /insights, /about
    ```
    Labels come from `ui.nav[id]`.
  - `src/lib/i18n.ts`: `localizePath(href: string, lang: Lang): string` (prefixes the locale path, `'/#services'` stays `'/#services'` for `en`, becomes `'/da/#services'` for a locale with path `/da/`), `alternates(pathname: string): { hreflang: string; href: string }[]` (absolute URLs for every locale plus `x-default`).
  - `src/lib/content.ts`: `getUi(lang)`, `getSection(lang, id)`, `getServices(lang)`, `getSectors(lang)`, `getPrinciples(lang)` — the lists sorted by `order`. Entries keep their collection type so components can `render()` the body.
  - `src/lib/contact.ts`:
    ```ts
    export const isPlaceholder = (v: string): boolean => /^\[.*\]$/.test(v.trim());
    export interface ContactLink { label: string; href: string | null; external: boolean }
    export function emailLink(email: string): ContactLink;      // placeholder → { label: email, href: null }; real → mailto:
    export function linkedinLink(url: string): ContactLink;     // placeholder → href null; real → label 'LinkedIn', href url, external true
    ```
  - Content collections `services`, `sectors`, `principles`, `sections` (Markdown, one folder per language, entry id `<lang>/<name>`), `ui` (YAML, one file per language). Front matter: `title`, `order`, `slug` (+ `tags: string[]` for services). `sections/en/hero.md` front matter: `fixed`, `endings: string[]`, `primaryCta`, `secondaryCta`; body = sub-line.
  - `ui/en.yaml` keys: `meta.title`, `meta.description`, `nav.services|about|approach|sectors|contact`, `nav.label` ("Main navigation"), `nav.menuOpen` ("Menu"), `nav.menuClose` ("Close"), `skip` ("Skip to content"), `hero.pause` ("Pause animation"), `hero.play` ("Play animation"), `footer.country` ("Denmark"), `footer.cvr` ("CVR"), `footer.privacy` ("Privacy"), `home` ("geofare home", logo link label).
  - Section anchors: `#top` (hero), `#services`, `#about`, `#approach`, `#sectors`, `#contact`; `<main id="main">`.
  - `Base.astro` props: `{ lang: Lang; title?: string; description?: string; noindex?: boolean }`; renders Header, `<main id="main"><slot /></main>`, Footer.

**Requirements**

- Astro config: `output: 'static'`, `site: site.url`, `trailingSlash: 'ignore'`, built-in `i18n` with `defaultLocale: 'en'`, `locales: ['en']`, no prefix for the default locale; `@astrojs/sitemap` (exclude `/privacy` and `/404`); **all CSS and JS emitted as external files** (`build.inlineStylesheets: 'never'`, `vite.build.assetsInlineLimit: 0`, and whatever Astro 7 needs so processed `<script>`s are never inlined — verify in `dist/`).
- Content: create every file from `tests/fixtures/copy.en.json`, word for word. Service example (`src/content/services/en/see-whats-there.md`):
  ```md
  ---
  title: See what’s there.
  order: 1
  slug: see-whats-there
  tags:
    - Earth observation
    - Geodata sourcing & integration
    - Geospatial analysis
  ---
  We use satellite observations, open geodata and your own records to build a clear picture of the ground as it is today.
  ```
  Sector example (`src/content/sectors/en/municipalities.md`): front matter `title: Municipalities`, `order: 1`, `slug: municipalities`; body is the sentence as a paragraph, then the three bullets as a Markdown list. Slugs: services `see-whats-there`, `know-whats-coming`, `decide-what-comes-first`, `make-risk-make-sense`; sectors `municipalities`, `emergency-management`, `urban-planners-developers`, `housing-property-owners`, `government-infrastructure`, `finance-insurance`, `energy-utilities`; principles `start-small`, `open-by-default`, `yours-to-keep`, `no-layers`.
  Typography: apostrophes and quotation marks are typographic (’ “ ”) — keep Astro's smartypants on for bodies and type ’ in front-matter titles. `about-quote.md` body is the quote including its quotation marks. The copy test normalises quote glyphs, nothing else.
  `sections/en/services.md` and `approach.md` carry only `title` ("Services", "How we work"). `privacy.md`: `title: Privacy`, body `[privacy text]`. `not-found.md`: `title: Page not found`, body `This page does not exist.`, front matter `back: Back to the home page`.
- Sections render semantic HTML only (design comes in Tasks 3–4) but must already satisfy:
  - Hero: `<h1>` whose accessible text is exactly "Make good decisions when it matters." (fixed part + last ending), sub-line, two links styled as buttons (`#contact`, `#services`).
  - Services: `h2` + ordered list of four `article`s, each with number (`01`…`04`, derived from `order`), `h3`, body, tag list (`ul`).
  - About: `h2` = mission claim, mission body, `h3` founder + body, `figure > blockquote`, `h3` team + body. No portrait yet.
  - Approach: `h2` + list of four `h3` + sentence.
  - Sectors: `h2` claim, intro, seven `<details>` each with `<summary><h3>…</h3></summary>` and the rendered body. All text in the HTML.
  - Contact: `h2`, body, the two links via `emailLink` / `linkedinLink` (placeholder → plain text, not an `<a>`).
  - Footer: logo, the footer sentence assembled from `site.company` + `ui.footer` + build year, Privacy link to `/privacy`.
  - Header: logo linking to `/`, `<nav aria-label>` with the four links, "Get in touch" link. Unstyled-but-usable is fine here.
- `base.css`: modern reset, `body` type from tokens, `.container` (max-width `--content-max`, padding-inline `--gutter`), `.sr-only`, focus ring, skip link (visible on focus), `scroll-padding-top`, reduced-motion-guarded smooth scroll. `fonts.css`: `@font-face` for Figtree variable (`font-weight: 300 900`, `font-display: swap`, file from `@fontsource-variable/figtree` so it is hashed into `/_astro/`) plus a metric-matched `"Figtree Fallback"` (`src: local("Arial")` with `size-adjust`, `ascent-override`, `descent-override`, `line-gap-override` computed from the font's real metrics) so swapping causes no layout shift. Preload the woff2 in `<head>`.
- `<head>`: charset, viewport, title, description, canonical, `hreflang` alternates + `x-default`, Open Graph (`og:title`, `og:description`, `og:type=website`, `og:url`, `og:image` absolute + width/height + alt, `og:locale=en_GB`, `og:site_name`), `twitter:card=summary_large_image`, favicon links, JSON-LD `ProfessionalService` (`name`, `url`, `description`, `logo`, `image`, `address.addressCountry: "DK"`, `areaServed`, plus `email` / `sameAs` only when not placeholders). `privacy` and `404` are `noindex`.
- Brand PNGs: `scripts/generate-brand-assets.mjs` (uses `sharp`) renders `brand.svg` unmodified, centred on the `--bg` colour (read it by parsing `src/styles/tokens.css`, do not repeat the literal): `og-image.png` 1200×630 (mark 300 px), `apple-touch-icon.png` 180×180 (mark 112 px), `favicon-32.png` (transparent). `public/favicon.svg` is a byte copy of `brand.svg`. Commit the outputs.

- [ ] **Step 1: Scaffold.** `npm init`, install `astro @astrojs/sitemap @fontsource-variable/figtree` and dev deps `typescript @astrojs/check vitest @playwright/test @axe-core/playwright node-html-parser sharp`. Write configs. `git mv` the two SVGs. Verify: `npm run build` produces `dist/index.html`. Commit.
- [ ] **Step 2: Write the failing built-output tests.** `tests/build/copy.test.ts`:
  ```ts
  import { readFileSync } from 'node:fs';
  import { parse } from 'node-html-parser';
  import { describe, expect, it } from 'vitest';
  import copy from '../fixtures/copy.en.json';

  export const norm = (s: string) =>
    s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

  const html = readFileSync('dist/index.html', 'utf8');
  const root = parse(html);
  const text = norm(root.querySelector('body')!.textContent);
  const sectionText = (id: string) => norm(root.querySelector(`#${id}`)!.textContent);

  describe('copy matches the brief word for word', () => {
    it('hero', () => {
      const t = sectionText('top');
      for (const s of [copy.hero.fixed, copy.hero.endings.at(-1)!, copy.hero.subline, copy.hero.primaryCta, copy.hero.secondaryCta]) expect(t).toContain(s);
    });
    it('services, in order, with numbers and tags', () => {
      const t = sectionText('services');
      let at = -1;
      for (const s of copy.services) {
        for (const piece of [s.number, s.title, s.body, ...s.tags]) expect(t).toContain(piece);
        const i = t.indexOf(s.title); expect(i).toBeGreaterThan(at); at = i;
      }
    });
    it('about', () => {
      const t = sectionText('about'); const a = copy.about;
      for (const s of [a.mission.title, a.mission.body, a.founder.title, a.founder.body, a.quote, a.team.title, a.team.body]) expect(t).toContain(s);
    });
    it('principles', () => {
      const t = sectionText('approach');
      expect(t).toContain('How we work');
      for (const p of copy.principles) { expect(t).toContain(p.title); expect(t).toContain(p.body); }
    });
    it('sectors, in order, all text in the HTML', () => {
      const t = sectionText('sectors'); let at = -1;
      expect(t).toContain(copy.sectors.title); expect(t).toContain(copy.sectors.intro);
      for (const s of copy.sectors.items) {
        for (const piece of [s.title, s.lead, ...s.bullets]) expect(t).toContain(piece);
        const i = t.indexOf(s.lead); expect(i).toBeGreaterThan(at); at = i;
      }
    });
    it('contact and footer keep their placeholders', () => {
      const t = sectionText('contact');
      for (const s of [copy.contact.title, copy.contact.body, ...copy.contact.links]) expect(t).toContain(s);
      const f = norm(root.querySelector('footer')!.textContent);
      for (const s of copy.footer.fragments) expect(f).toContain(s.replace('{year}', String(new Date().getFullYear())));
    });
    it('navigation labels', () => {
      const n = norm(root.querySelector('header nav')!.textContent);
      for (const s of copy.nav) expect(n).toContain(s);
      expect(norm(root.querySelector('header')!.textContent)).toContain('Get in touch');
    });
    it('section order answers what, who, how, for whom', () => {
      const ids = root.querySelectorAll('main > section, main > div[id]').map((e) => e.id).filter(Boolean);
      expect(ids).toEqual(['top', 'services', 'about', 'approach', 'sectors', 'contact']);
    });
    it('the brand name is lowercase in running text', () => { expect(text).not.toMatch(/\bGeofare\b|\bGEOFARE\b/); });
  });

  describe('document outline', () => {
    it('has one h1 that reads the final sentence to assistive tech', () => {
      const h1s = root.querySelectorAll('h1'); expect(h1s).toHaveLength(1);
      const clone = parse(h1s[0].outerHTML); clone.querySelectorAll('[aria-hidden="true"]').forEach((e) => e.remove());
      expect(norm(clone.textContent)).toBe('Make good decisions when it matters.');
    });
    it('never skips a heading level', () => {
      let prev = 0;
      for (const h of root.querySelectorAll('h1,h2,h3,h4,h5,h6')) { const l = Number(h.tagName[1]); expect(l - prev).toBeLessThanOrEqual(1); prev = l; }
    });
  });
  ```
  `tests/build/seo.test.ts` asserts: `<title>` and meta description equal `copy.meta`; `<html lang="en-GB">`; canonical, `hreflang="en"` and `x-default` present and absolute; `og:image` absolute and the file exists in `dist/`; JSON-LD parses, `@type === 'ProfessionalService'`, and no string value anywhere in it matches `/\[[^\]]+\]/` (no placeholder leaks); `dist/robots.txt` has a `Sitemap:` line; `dist/sitemap-index.xml` exists and the sitemap does not list `/privacy`; `dist/404.html` and `dist/privacy/index.html` exist and carry `noindex`.
  `tests/build/output.test.ts` asserts over every `dist/**/*.html`: no `<style` element, no `style="` attribute, no `<script>` with inline code other than `type="application/ld+json"`, no `http(s)://` URL in any `src`, `srcset` or `<link href>` except ones starting with `site.url` (privacy: no third-party requests; `<a href>` to other sites is allowed); total gzip size of `dist/_astro/*.js` < 50 000 bytes; every font file is `.woff2`.
  `tests/unit/contact.test.ts`: `isPlaceholder('[email address]')` true, `isPlaceholder('hello@geofare.dk')` false; `emailLink('[email address]')` → `{ label: '[email address]', href: null, external: false }`; `emailLink('hello@geofare.dk')` → href `mailto:hello@geofare.dk`, label `hello@geofare.dk`; `linkedinLink('[LinkedIn URL]')` → href null; `linkedinLink('https://www.linkedin.com/company/geofare')` → label `LinkedIn`, that href, external true.
  `tests/unit/i18n.test.ts`: `localizePath('/#services', 'en') === '/#services'`; `alternates('/')` contains `{ hreflang: 'en', href: site.url + '/' }` and an `x-default`.
- [ ] **Step 3: Run `npm test`** — expect failures (sections and content missing).
- [ ] **Step 4: Implement** config, content files, libs, styles, layout, sections, pages, brand assets until `npm test` and `npm run check` pass with no warnings.
- [ ] **Step 5: `tests/e2e/smoke.spec.ts`** (Playwright, `use: { channel: 'chrome' }`, `webServer: { command: 'npm run preview', url: 'http://localhost:4321' }`): the page loads with zero console errors, zero failed requests, every request goes to `localhost`, `document.cookie === ''`, and `document.fonts.check('1rem Figtree')` is true after `document.fonts.ready`. Run `npm run test:e2e`, expect pass.
- [ ] **Step 6: Commit.**

---

### Task 2: The line field — geometry, static SVG, canvas driver

The concept is the logo in motion. Open `src/assets/brand.svg` and look at it rendered: a square cut by diagonal bands running lower-left to upper-right at about 45°, whose edges are not straight — each alternates between straight diagonal runs and a soft S-shaped step, all bands in step with each other. Read as water, contour lines and strata at once. The field extends those band edges across any rectangle as thin lines.

**Files:**
- Create: `src/lib/linefield.ts`, `src/components/LineField.astro`, `src/scripts/hero-field.ts`
- Test: `tests/unit/linefield.test.ts`, `tests/unit/linefield-size.test.ts`

**Interfaces:**
- Consumes: tokens `--field-line`, `--field-opacity` from Task 1.
- Produces:
  ```ts
  // src/lib/linefield.ts — pure, no DOM, no Math.random
  export const CYCLE_SECONDS: number;            // ≥ 20; the field is periodic: t and t + CYCLE_SECONDS give the same lines
  export interface FieldOptions {
    width: number; height: number;               // CSS px of the area to cover
    time?: number;                               // seconds, default 0
    level?: number;                              // -1..1, shifts the whole field along its normal like a water level; default 0
    spacing?: number;                            // px between neighbouring lines; default from spacingFor(width)
    seed?: number;                               // default 1
  }
  export type Polyline = Float32Array;           // x0, y0, x1, y1, …
  export function spacingFor(width: number): number;      // wider spacing (fewer lines) on small screens
  export function fieldLines(o: FieldOptions): Polyline[];
  export function toSvgPath(line: Polyline, precision?: number): string;   // "M…L…", default 1 decimal
  ```
  ```astro
  <!-- src/components/LineField.astro: a static crop, rendered at build time -->
  <LineField width={1440} height={240} time={12} seed={3} class="…" />
  <!-- → <svg aria-hidden="true" focusable="false" viewBox="0 0 W H" preserveAspectRatio="xMidYMid slice">
         paths with fill="none" stroke="currentColor" vector-effect="non-scaling-stroke"; stroke width and opacity come from CSS -->
  ```
  ```ts
  // src/scripts/hero-field.ts
  export interface HeroField {
    play(): void; pause(): void; readonly running: boolean;
    setLevel(level: number): void;               // eased over ~2.5 s, never a jump
    destroy(): void;
  }
  export function mountHeroField(canvas: HTMLCanvasElement, opts?: { quietZones?: () => DOMRect[] }): HeroField;
  ```
  The driver sets `canvas.dataset.state` to `'running' | 'paused' | 'static'` (`static` = reduced motion).

**Requirements**

- Look: thin lines (1 to 1.5 CSS px), no fills, colour from the canvas element's computed `--field-line`, alpha from `--field-opacity`. The curves must be recognisably the logo's band edges: same diagonal, same step rhythm. Neighbouring lines stay roughly parallel but breathe (spacing varies slowly across the field, like contour lines closing up on a slope). Build it from layered sines / a cheap value-noise in the rotated (along-band, across-band) coordinate system. No library.
- Motion: slow, continuous drift along the band diagonal plus a slow rise and fall across it. `CYCLE_SECONDS` ≥ 20 (aim for 40–60). No sudden movement. `level` moves the field across the bands by at most about one line spacing.
- Driver: `requestAnimationFrame` capped at 30 fps; pauses when `document.hidden` or when the canvas is off screen (`IntersectionObserver`), and resumes without a time jump; handles resize (`ResizeObserver`) and `devicePixelRatio` (cap DPR at 2); fewer lines on small screens via `spacingFor`. With `prefers-reduced-motion: reduce` it draws exactly one frame, schedules nothing, and `play()` does nothing. `quietZones` rectangles (viewport coordinates of text blocks) are erased with a soft feather (`destination-out`, about 80 px falloff) every frame so no line passes behind text.
- Size: the built JS chunk containing the driver and geometry is < 15 000 bytes uncompressed.
- You need to see it. Use a temporary harness page (for example `src/pages/field-harness.astro`) on a `#FCF2EB` background next to the logo, screenshot it with Playwright (system Chrome) at 360×740 and 1280×800 at several `time` values, compare to the logo, iterate. Delete the harness before committing. Put two final screenshots in your report file's folder and reference them.

- [ ] **Step 1: Failing unit tests** `tests/unit/linefield.test.ts`:
  - deterministic: two calls with the same options return equal arrays;
  - periodic: `fieldLines({…, time: 3})` equals `fieldLines({…, time: 3 + CYCLE_SECONDS})` within 0.01 px; and `CYCLE_SECONDS >= 20`;
  - slow: between `time: 0` and `time: 1/30` no point moves more than 1.5 px (1280×800);
  - covers: at 1280×800 every 160 px grid cell of the area is crossed by at least one line; all values finite;
  - continuous: no segment longer than 24 px;
  - responsive ("fewer lines on small screens"): `fieldLines` at 360×740 returns fewer lines than at 1280×800, and `spacingFor(360) >= spacingFor(1280)` (never denser on a phone);
  - `level`: lines at `level: 1` differ from `level: 0`, by no more than `2 * spacing` anywhere;
  - `toSvgPath(new Float32Array([0, 0, 10.26, 5]))` is `"M0 0L10.3 5"`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/linefield.test.ts` — expect FAIL (module missing).
- [ ] **Step 3: Implement `linefield.ts`**, iterate on the look with the harness until it reads as the logo in motion. Tests green.
- [ ] **Step 4: `LineField.astro`** and `hero-field.ts`. `tests/unit/linefield-size.test.ts`: bundle and minify `src/scripts/hero-field.ts` (with its `linefield.ts` import) in memory using the bundler that ships with the installed Astro/Vite (programmatic build, `write: false`) and assert the output is < 15 000 bytes. This test does not depend on any page.
- [ ] **Step 5: Remove the harness, `npm test`, commit.**

---

### Task 3: Header and hero — design, rotation, animation in place

Invoke the `frontend-design:frontend-design` skill first; the Design System section above is the approved design plan — build to it, and use the skill's critique loop on your screenshots.

**Files:**
- Modify: `src/components/sections/Header.astro`, `src/components/sections/Hero.astro`, `src/styles/base.css` (only shared utilities)
- Create: `src/components/Button.astro`, `src/scripts/hero-rotator.ts`, `src/scripts/hero.ts`, `src/scripts/menu.ts`
- Test: `tests/e2e/hero.spec.ts`, `tests/e2e/header.spec.ts`, `tests/e2e/nojs.spec.ts`, `tests/unit/hero-rotator.test.ts` (if logic is extractable without DOM)

**Interfaces:**
- Consumes: `mountHeroField`, `LineField.astro`, `fieldLines` (Task 2); content getters, `mainNav`, `contactCta`, `ui` strings, tokens (Task 1).
- Produces: `Button.astro` props `{ href: string; variant?: 'primary' | 'secondary'; class?: string }` with a default slot (Task 4 reuses it); CSS custom property `--header-h` honoured by the real header height.

**Requirements**

- **Header:** sticky, slim (`--header-h`), solid `--bg`, no shadow, no blur. Logo (`brand-with-name.svg` as an `<img>` with width/height, about 44 px tall, linked to `/`, alt from `ui.home`). Four nav links at weight 500 in `--ink`, accent on hover, current-section state not required. "Get in touch" as a primary `Button`. Below 60rem the links collapse behind a text button showing `ui.nav.menuOpen` / `ui.nav.menuClose` with `aria-expanded` and `aria-controls`; the open panel is a full-width cream sheet under the header with the links at `--step-title`; Escape closes it and returns focus to the button; choosing a link closes it. Without JavaScript (`@media (scripting: none)`) the links are simply shown, wrapped, and the menu button is hidden. Targets ≥ 44 px.
- **Hero layout:** `#top`, `min-height: calc(100svh - var(--header-h))`, three rows: headline at the top, free space, then sub-line + buttons at the bottom-left with the pause control at the bottom-right. The free middle is where the field is densest. Headline `--step-hero`, weight 600, `--leading-hero`, `--tracking-hero`, accent. Sub-line `--step-lead`, `--ink`, max about 34em of its own size (≈ 38ch). On very short viewports content flows; nothing is clipped.
- **Headline markup** (the `h1` must read "Make good decisions when it matters." without JS and to assistive tech):
  ```html
  <h1 class="hero__title">
    <span class="hero__fixed">Make good decisions</span>
    <span class="hero__final">when it matters.</span>
    <span class="hero__rotator" aria-hidden="true">
      <span class="hero__ending" data-active>when the future is uncertain.</span>
      <span class="hero__ending">when rivers overflow.</span> …all five, in order…
    </span>
  </h1>
  ```
  Default CSS: rotator `display: none`, `.hero__final` visible. Under `@media (scripting: enabled) and (prefers-reduced-motion: no-preference)`: `.hero__final` becomes `.sr-only`-equivalent and the rotator is a one-cell grid with all endings stacked in it (so the slot is always as tall as the tallest ending and nothing below moves); only `[data-active]` is visible. The ending starts on its own line under the fixed part.
- **Rotation** (`hero-rotator.ts`): endings in order, 3000 ms each, soft cross-fade with a small upward slide (≤ 0.3em, 500 ms); stops on "when it matters." and never loops. Export `startRotator(root: HTMLElement, opts: { intervalMs: number; onChange?: (index: number) => void }): { finish(): void }`; `finish()` jumps straight to the last ending.
- **Field in place** (`hero.ts` wires everything): `<canvas aria-hidden="true">` covering the whole hero behind the content, mounted with `mountHeroField`; quiet zones = bounding rects of the headline, the sub-line block and the pause control. Inside `<noscript>`, a static `LineField` crop placed in the free middle row only (never behind text). On each ending change call `setLevel` with a small value per ending (`[0, 0.6, 1, 0.35, 0]`) — subtle; drop it if it is noticeable as a jump.
- **Pause control:** a real `<button>` in the hero's bottom-right corner, visible label from `ui.hero.pause` / `ui.hero.play` (icon-only below 30rem, keeping the accessible name), a two-bar / triangle glyph drawn in CSS or inline SVG. It pauses and resumes the field **and** the rotation (pausing during the rotation calls `finish()`), toggles `aria-pressed`. Hidden when `canvas.dataset.state === 'static'` (reduced motion) and without JavaScript. Target ≥ 44 px, contrast ≥ 4.5:1.
- **Contrast:** no line may sit behind any hero text or button. Verify by screenshot at 360 and 1280.

- [ ] **Step 1: Failing e2e tests.**
  `tests/e2e/hero.spec.ts` (use `page.clock.install()` before navigation so time is controllable; viewport 1280×800 unless stated):
  - endings appear in the brief's order: after load the visible ending is `endings[0]`; after `clock.runFor(3000)` it is `endings[1]`; … after 12 000 ms it is "when it matters."; after another 20 000 ms it is still "when it matters." (no loop).
  - the `h1` accessible name is "Make good decisions when it matters." throughout (`getByRole('heading', { level: 1, name: 'Make good decisions when it matters.' })`).
  - rotation causes no layout movement: record `getBoundingClientRect()` of the sub-line and both buttons before and after each change, at 360×740 and 1280×800; all equal.
  - the pause button toggles: click → `canvas[data-state="paused"]`, name becomes "Play animation", visible ending is "when it matters."; click again → `running`.
  - frame cap: count canvas draws per second via an init script that wraps `CanvasRenderingContext2D.prototype.clearRect`; with real time (no fake clock) over 2 s the count is ≤ 62 and ≥ 20.
  - hidden tab pauses: dispatch a `visibilitychange` with `document.hidden` stubbed true → draw count stays flat for 500 ms.
  - reduced motion (`test.use({ reducedMotion: 'reduce' })`): visible text is "when it matters." immediately, `canvas[data-state="static"]`, draw count does not increase over 1 s, the pause button is not visible.
  - no text sits on lines: for the headline, sub-line and pause button rects, sample the canvas `getImageData` inside each rect (inset by 4 px) — every alpha value is 0.
  `tests/e2e/header.spec.ts`: at 1280 the four links and the CTA are visible and each `href` ends with the right anchor; clicking "Services" brings `#services` into view below the header (its top ≥ header bottom); at 360 the menu button has `aria-expanded="false"`, click → `true` and links visible, Escape → closed and the button focused; Tab order starts skip link → logo → …; the skip link moves focus to `#main`.
  `tests/e2e/nojs.spec.ts` (`test.use({ javaScriptEnabled: false })`): `h1` text visible is "Make good decisions when it matters."; nav links visible at 360 and 1280; the noscript line-field SVG is present; no pause button visible.
- [ ] **Step 2: Run** `npm run build && npx playwright test tests/e2e/hero.spec.ts tests/e2e/header.spec.ts tests/e2e/nojs.spec.ts` — expect FAIL.
- [ ] **Step 3: Implement** header, hero, scripts. Keep `npm test` (copy, outline, output, size tests) green — the hero's five endings now exist in the DOM inside the `aria-hidden` rotator.
- [ ] **Step 4: Look.** Screenshots at 360×740, 768×1024, 1280×800, 1920×1080 at t ≈ 1 s, 4 s and 14 s. Check against the Design System and the brief's design direction; fix; repeat. Save the final 360 and 1280 screenshots beside your report.
- [ ] **Step 5: `npm test && npm run test:e2e && npm run check`, commit.**

---

### Task 4: Services, About, How we work, Who we work with, Contact, Footer — design

Invoke the `frontend-design:frontend-design` skill first; the Design System section above is the approved design plan. Read `Header.astro`, `Hero.astro` and `Button.astro` from Task 3 and match their hand: same spacing rhythm, same hover and focus behaviour.

**Files:**
- Modify: `src/components/sections/Services.astro`, `About.astro`, `Approach.astro`, `Sectors.astro`, `Contact.astro`, `Footer.astro`, `src/pages/privacy.astro`, `src/pages/404.astro`, `src/styles/base.css` (shared utilities only)
- Create: `src/components/Tag.astro`, `src/components/Portrait.astro`
- Test: `tests/e2e/layout.spec.ts`, `tests/e2e/sectors.spec.ts`, `tests/e2e/a11y.spec.ts`, extend `tests/e2e/nojs.spec.ts`

**Interfaces:**
- Consumes: `Button.astro`, `LineField.astro`, content getters, `emailLink` / `linkedinLink`, tokens.
- Produces: `Portrait.astro` props `{ src?: ImageMetadata; alt?: string }` — with no `src` it renders the 4:5 line-field crop (`aria-hidden`); with one, the photo. `Tag.astro` default slot.

**Requirements** (wireframes in the Design System section are binding for structure; proportions are yours to tune by eye)

- **Services:** `h2` signpost; 2 × 2 grid from 48rem up (column gap about 8vw, row gap about 6rem), stacked below. Each block: number in accent, weight 500, `font-variant-numeric: tabular-nums`; claim `h3` at `--step-claim-s`, accent, weight 600; body in `--ink` at `--step-body`, max `--measure`; tags as `Tag` pills in a wrapping list. No boxes, no rules.
- **About:** mission `h2` at `--step-claim` spanning about 9 columns; mission body at `--step-lead` offset to the right half. Founder row: `Portrait` (4:5, about 4 columns) left, founder `h3` (`--step-title`, weight 600, ink) + body right. Quote set apart on its own row: `--step-claim-s`, accent, weight 500, hanging opening quotation mark, generous space above and below, no attribution line (the brief gives none). Team block aligned with the founder text column. DOM order stays mission → founder → quote → team.
- **How we work:** full-bleed `--accent` background, all text `--on-accent`, focus ring `--on-accent`. `h2` signpost, then four columns from 64rem (two from 40rem, one below): principle name `h3` at `--step-claim-s` weight 600, sentence at `--step-body`. A `LineField` crop in `--on-accent` (opacity about 0.3) runs along the bottom edge, below the text, never behind it.
- **Who we work with:** `h2` claim, intro at `--step-lead` (max `--measure`), then the seven `<details>` rows. Row: hairline `--rule` above (and below the last), sector name `h3` at `--step-claim-s` weight 500 in `--ink`, a plus that becomes a minus drawn with two CSS bars at the right; whole summary is the target (min-height 4.5rem), name and sign turn accent on hover and when open; default marker removed in all browsers. Open panel: sentence at `--step-lead` left, bullets right from 56rem (stacked below), bullets with a short accent dash marker, list semantics preserved. The first row is open on load. Opening animates height only where `interpolate-size` / `::details-content` is supported and motion is allowed; otherwise it just opens.
- **Contact:** one `LineField` band (about 12rem tall, full-bleed, `--accent` at `--field-opacity`) between Sectors and Contact. `h2` claim, body at `--step-lead`. Two link blocks stacked: full-row, text at `--step-claim-s` weight 500, 2px accent rule beneath; a real link inverts on hover/focus-visible to accent fill with `--on-accent` text; a placeholder renders as plain text in `--ink-muted` in the same block shape with no hover.
- **Footer:** hairline top, small logo (`brand-with-name.svg`, about 36 px tall), the footer sentence at `--step-small` in `--ink-muted`, "Privacy" as an underlined link. Quiet and small.
- **Privacy and 404 pages:** same header/footer, a single column: `h1` at `--step-claim`, body below; 404 has a `Button` back to `/`.
- Reduce, then check: no eyebrow labels, no all-caps, no arrows, no cards, no shadows, no gradients (`grep -R "gradient\|box-shadow\|text-transform: uppercase\|backdrop-filter" src` must return nothing outside the canvas quiet-zone feathering in `hero-field.ts`).

- [ ] **Step 1: Failing e2e tests.**
  `tests/e2e/layout.spec.ts`: for widths 320, 360, 768, 1280, 1920 (height 900): `document.documentElement.scrollWidth <= window.innerWidth`; no element's bounding box extends past the viewport's right edge (walk all elements, ignore `aria-hidden` SVG/canvas); at 1280 the four service blocks form two columns (two distinct `x` values, two rows) and at 360 one column; at 1280 the four principles share one `y`; the `#approach` section's computed background equals the accent token and spans the full viewport width.
  `tests/e2e/sectors.spec.ts`: seven `details`; the first is open on load; focusing the second summary and pressing Enter opens it and its three bullets become visible; every summary's height ≥ 44 px.
  `tests/e2e/a11y.spec.ts`: `@axe-core/playwright` with tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` — zero violations on `/` at 360 and 1280, with every `details` opened first, on `/privacy` and on `/404`; plus the same with the mobile menu open at 360.
  Extend `nojs.spec.ts`: with JS off every sector summary can be opened by click and shows its bullets.
- [ ] **Step 2: Run** them — expect FAIL on layout/sector expectations.
- [ ] **Step 3: Implement** section by section, top to bottom.
- [ ] **Step 4: Look.** Full-page screenshots at 360, 768, 1280, 1920 and per-section crops at 360 and 1280. Critique against the Design System and the brief's "What to take from the reference" list; remove anything that is not doing a job; fix; repeat. Save the final 360 and 1280 full-page screenshots beside your report.
- [ ] **Step 5: `npm test && npm run test:e2e && npm run check`, commit.**

---

### Task 5: Docker, nginx, compose, README

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docker/nginx.conf`, `compose.yaml`, `README.md`, `tests/docker/smoke.sh`
- Modify: `package.json` (script `test:docker`)

**Interfaces:**
- Consumes: `npm ci && npm run build` → `dist/`; `SITE_URL` build-time variable (Task 1).
- Produces: image `geofare-website`, listening on container port 8080; compose service `web`; host port from `GEOFARE_PORT` (default 8080).

**Requirements**

- `Dockerfile`, multi-stage: `node:24-alpine` build stage (`npm ci`, `ARG SITE_URL`, `npm run build`); final stage `nginxinc/nginx-unprivileged:stable-alpine` containing only nginx, `docker/nginx.conf` and `dist/`. Runs as the image's non-root user (uid 101). `EXPOSE 8080`. `HEALTHCHECK` using busybox `wget` against `http://127.0.0.1:8080/healthz`.
- `docker/nginx.conf` (server block): `listen 8080`; `root /usr/share/nginx/html`; `location = /healthz` returns 200 `ok` with `access_log off`; gzip on for html, css, js, json, xml, svg, txt, webmanifest (`gzip_vary on`, `gzip_min_length 256`); `/_astro/` gets `Cache-Control: public, max-age=31536000, immutable`; HTML gets `Cache-Control: no-cache`; other static files (favicon, og image) one day; `error_page 404 /404.html` served with status 404; `try_files $uri $uri/index.html $uri.html =404` (no directory redirects that leak the internal port: `absolute_redirect off`); `server_tokens off`; security headers on every response including errors (`always`): `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`, `Cross-Origin-Opener-Policy: same-origin`. Remember nginx drops inherited `add_header`s in a location that defines its own — use an include or repeat them. No HSTS: the container serves plain HTTP and the reverse proxy owns TLS.
- `compose.yaml`: service `web`, `build: { context: ., args: { SITE_URL: ${SITE_URL:-https://geofare.example} } }`, `image: geofare-website`, `ports: ["${GEOFARE_PORT:-8080}:8080"]`, `restart: unless-stopped`, `read_only: true` with `tmpfs: [/tmp]`, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, the health check.
- `.dockerignore`: everything not needed for the build (`node_modules`, `dist`, `.git`, `.superpowers`, `docs`, `tests`, `briefing.md`, …).
- `README.md`: what this is; requirements (Node ≥ 22.12, Docker); run locally (`npm install`, `npm run dev`); build; test commands; **deploy and update** (`docker compose up -d --build`, port and `SITE_URL` configuration, "edit a Markdown file → rebuild → restart" as exact commands, health check, reverse-proxy note); **where things live** (content, config, components, tokens); **how to add** a service or sector (one Markdown file), a section (component + content file + one line in `Home.astro` + nav entry), a page (the planned routes `/services/[slug]`, `/sectors/[slug]`, `/projects`, `/insights`, `/about`, `/privacy` and how slugs already support them), a language (Danish at `/da/`: add the locale in `site.ts` and `astro.config.mjs`, copy `src/content/*/en` to `da`, add `ui/da.yaml`, add `src/pages/da/index.astro`); **open points** still holding placeholders and the one file where each is filled in; replacing the portrait. Plain, short, British English, accurate to the actual code — verify every command you document by running it.
- The site must work under that CSP: load it from the container in Chrome and confirm zero console errors.

- [ ] **Step 1: Write `tests/docker/smoke.sh`** (bash, `set -euo pipefail`; builds from a clean checkout: `git archive HEAD | tar -x -C "$tmp"` then `docker compose -p geofare-smoke up -d --build --wait` there with `GEOFARE_PORT=18080`; always tears down in a trap). Assertions with `curl`: `/` 200 and contains "Make good decisions"; `/healthz` 200 `ok`; `/nope` 404 and body contains "Page not found"; `/` with `Accept-Encoding: gzip` has `content-encoding: gzip`; a `/_astro/*.css` URL taken from the HTML has `immutable`; the six security headers are present on `/`, on a `/_astro/` file and on the 404; no `Set-Cookie` anywhere; `docker inspect` health is `healthy`; `docker exec … id -u` is not `0`; `docker image inspect` size reported.
- [ ] **Step 2: Run it** — expect FAIL (no Dockerfile).
- [ ] **Step 3: Implement** Dockerfile, nginx config, compose, dockerignore until `npm run test:docker` passes.
- [ ] **Step 4: CSP check in a browser:** with the container up, run a short Playwright script against `http://localhost:18080` asserting zero console errors and zero CSP violations (`securitypolicyviolation` listener), the hero canvas reaches `data-state="running"`, and the font loads.
- [ ] **Step 5: Write the README**, run every documented command once. Commit.

---

### Task 6: Quality-bar verification and hardening

Prove every line of the brief's quality-bar table against the running container, fix what fails, and leave the evidence.

**Files:**
- Create: `scripts/lighthouse.mjs`, `tests/e2e/privacy.spec.ts`, `tests/e2e/contrast.spec.ts`, `docs/quality-report.md`, `docs/screenshots/home-360.png`, `docs/screenshots/home-1280.png`
- Modify: `playwright.config.ts` (projects for `firefox` and `webkit` in addition to Chrome), `package.json` (script `lighthouse`), any source file a failing check requires

**Interfaces:**
- Consumes: everything above; the compose service on `GEOFARE_PORT`.
- Produces: `docs/quality-report.md` — one row per quality-bar line: requirement, how it was measured, result, evidence path.

**Requirements**

- `scripts/lighthouse.mjs`: runs Lighthouse (via `npx -y lighthouse`, mobile defaults, headless system Chrome) three times against a URL argument (default `http://localhost:8080`), writes the median run's JSON to `.lighthouse/`, prints the four category scores, exits non-zero if any is < 95. Run it against the **container** (gzip and cache headers matter). Also confirm CLS is 0 (≤ 0.01) and report LCP and total transfer size.
- `tests/e2e/contrast.spec.ts`: for every visible text node on `/` at 360 and 1280 (all `details` open), compute the WCAG contrast of its computed colour against its effective background colour (walk up to the first non-transparent background) and assert ≥ 4.5 (≥ 3 only for text ≥ 24 px or ≥ 18.66 px bold — but the brief says 4.5 everywhere, so assert 4.5 for all). Report the minimum found.
- `tests/e2e/privacy.spec.ts`: on `/`, after scrolling the whole page and opening every sector: `context.cookies()` is empty, `localStorage` and `sessionStorage` are empty, every request URL has the page's origin.
- Cross-browser: install Playwright's Firefox and WebKit (`npx playwright install firefox webkit`) and run the whole e2e suite in all three projects. Engine-specific failures are fixed in the source, not skipped. (The frame-cap test may be Chrome-only if another engine's timer granularity makes it flaky — say so in the report.)
- Keyboard walk-through, recorded in the report: Tab from the top through every interactive element at 1280 and at 360 (menu open), confirming a visible focus ring on each (screenshot the ring on a nav link, a button, a sector summary, a contact block, the pause button, and a focus on the blue section if any element there is focusable).
- Screenshots: full page at 360 and 1280 saved to `docs/screenshots/` (the brief asks for these two); also look at 768 and 1920. Check each against the brief's design direction; fix anything off.
- Copy: `npm test` green is the word-for-word proof; additionally read the rendered page once against `briefing.md` lines 117–223 for punctuation and order.
- Budgets: report total compressed JS, the animation chunk size, the font file size, total page weight.
- Anything that fails gets fixed here (smallest change that meets the bar, without breaking the Design System), with the fix listed in the report. Anything in the brief that looks wrong is **flagged in the report, not changed**.

- [ ] **Step 1:** Write `contrast.spec.ts`, `privacy.spec.ts`, the browser projects and `scripts/lighthouse.mjs`. Run everything; record failures.
- [ ] **Step 2:** Fix failures; re-run until `npm test`, `npm run test:e2e` (three engines), `npm run test:docker` and `npm run lighthouse` all pass.
- [ ] **Step 3:** Keyboard walk-through and screenshots; fix findings.
- [ ] **Step 4:** Write `docs/quality-report.md` with the measured numbers. Commit.
