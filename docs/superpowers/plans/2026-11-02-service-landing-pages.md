# Service Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A content-driven landing page template at `/services/<slug>/` (and `/da/services/<slug>/`), and its first page, Earth observation and remote sensing, with draft copy for template approval.

**Architecture:** One new content collection `landing` (one Markdown file per page and language, strict schema). One page component `src/components/pages/Landing.astro` composes nine sections, seven of them new components under `src/components/landing/`, two reused (`Clients`, `Contact`) with title props. Two route files mirror the imprint's. A pure helper builds the page's JSON-LD so it is unit-tested without Astro.

**Tech Stack:** Astro 7 static, TypeScript strict, Zod schemas, plain CSS with the existing tokens, Vitest (unit + built-output), Playwright (axe, overflow, language switch).

**Spec:** `docs/superpowers/specs/2026-11-02-service-landing-pages-design.md`

## Global Constraints

- Run with Homebrew Node first on PATH: `export PATH=/opt/homebrew/bin:$PATH`.
- No user-facing string in a component, layout or script; copy comes from `src/content/landing/`, labels from `src/content/ui/<lang>.yaml`.
- Palette, type scale, buttons, tags, focus, hairline and motion rules of the home page unchanged; no hex colour outside `src/styles/tokens.css`.
- CSP-clean: no `style=""`, no inline `<style>`, no inline `<script>` other than JSON-LD.
- One h1 per page; h2 per section; h3 per item; `aria-labelledby` on every section; `role="list"` on styled lists.
- Danish is a draft language: its page is built, `noindex`, out of the sitemap and the hreflang list (the base layout does this already).
- Commits wait for Niklas's decision on the uncommitted Clients work (spec, "Decided by Claude"). Each task ends with the files it would commit, staged for review, not committed.

## Review Focus

1. A landing file exists in one language only: the switcher must not link to a 404. Test in Task 1 (`checkLanding` throws naming the missing file).
2. An `offer` item with an empty `tags` list or a FAQ with one question: the schema refuses (`min(1)` and `min(2)`), build stops with the file name. Test in Task 1.
3. A FAQ answer containing `<` or `"`: the JSON-LD stays valid and cannot close its script element. Test in Task 2 (`jsonLd` escaping already exists; the helper test asserts `<` is escaped).
4. No JavaScript: every `<details>` row opens, the field windows show their stills, the hero shows no empty band. Covered by the existing `nojs` pattern; Task 6 adds the landing page to the overflow test and checks `details` open without scripts.
5. Narrow screens (320 px): long tags and the email block wrap without horizontal overflow. Task 6 adds the page to `layout.spec.ts`' overflow loop.

---

### Task 1: The `landing` collection and its loader

**Files:**
- Modify: `src/content.config.ts` (add `landing` collection, export)
- Modify: `src/lib/content.ts` (add `getLanding`, `getLandingSlugs`)
- Modify: `src/lib/content-rules.ts` (add `checkLanding`)
- Test: `tests/unit/content-rules.test.ts` (append)

**Interfaces:**
- Produces: `getLanding(lang: Lang, slug: string): Promise<CollectionEntry<'landing'>>` (throws naming the missing file); `getLandingSlugs(): Promise<string[]>` (slugs that exist in **every** language in `site.locales`; throws via `checkLanding` if a slug lacks a language); `checkLanding(langs: string[], ids: string[]): void` (pure; `ids` are entry ids `<lang>/<slug>`).
- Schema (strict object): `title`, `meta: { title, description }`, `hero: { primaryCta, secondaryCta }`, `clients: { title }`, `situations: { title, intro, items: [{ title, body }] (3..4) }`, `offer: { title, items: [{ title, body, tags: string[] min 1 }] (3..6) }`, `process: { title, steps: [{ title, body }] (3..5) }`, `audiences: { title, intro, items: [{ title, lead, points: string[] min 1 }] (3..6) }`, `why: { title, intro, founder: { title, body }, quote }`, `faq: { title, items: [{ question, answer }] (2..8) }`, `contact: { title, body }`. Body of the file = hero lead (checked non-blank in `getLanding`).

- [ ] **Step 1: Write the failing tests** in `tests/unit/content-rules.test.ts`:

```ts
describe('checkLanding', () => {
  it('passes when every slug exists in every language', () => {
    expect(() => checkLanding(['en', 'da'], ['en/eo', 'da/eo'])).not.toThrow();
  });
  it('names the missing file when a slug lacks a language', () => {
    expect(() => checkLanding(['en', 'da'], ['en/eo'])).toThrow('src/content/landing/da/eo.md');
  });
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/content-rules.test.ts` → FAIL, `checkLanding` is not exported.
- [ ] **Step 3: Implement** `checkLanding` in `content-rules.ts`; the collection in `content.config.ts` (loader `byLanguage('landing')`); `getLanding` and `getLandingSlugs` in `content.ts` (`getLandingSlugs` collects ids with `getCollection('landing')`, calls `checkLanding(Object.keys(site.locales), ids)`, returns the unique slugs sorted).
- [ ] **Step 4: Run** the unit test → PASS. Run `npm run check` → no type errors.
- [ ] **Step 5: Stage** `src/content.config.ts src/lib/content.ts src/lib/content-rules.ts tests/unit/content-rules.test.ts`.

### Task 2: Structured data helper and layout props

**Files:**
- Create: `src/lib/landing-seo.ts`
- Modify: `src/layouts/Base.astro` (prop `structuredData?: object[]`, rendered as further `<script type="application/ld+json">` blocks, same `<` escaping)
- Modify: `src/components/sections/Header.astro` (prop `contactHref?: string`, default `localizePath(contactCta.href, lang)`)
- Modify: `src/components/sections/Clients.astro` (prop `title?: string`, default the `clients` section title)
- Modify: `src/components/sections/Contact.astro` (props `title?: string`, `body?: string`; when `body` is given it is rendered as one `<p>` instead of the section's Markdown)
- Test: `tests/unit/landing-seo.test.ts`

**Interfaces:**
- Produces: `landingStructuredData(input: { name: string; description: string; url: string; providerName: string; providerUrl: string; faq: { question: string; answer: string }[] }): [service: object, faq: object]` returning a schema.org `Service` (`@type`, `name`, `description`, `url`, `serviceType: name`, `provider: { '@type': 'ProfessionalService', name, url }`) and a `FAQPage` (`mainEntity: [{ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } }]`).

- [ ] **Step 1: Write the failing test** `tests/unit/landing-seo.test.ts`: the Service carries name, url, serviceType and provider; the FAQPage has one Question per item with the answer text; both have `@context: 'https://schema.org'`.
- [ ] **Step 2: Run** it → FAIL (module missing).
- [ ] **Step 3: Implement** `landing-seo.ts`; add the four props. `Base.astro` serialises each extra block with the existing `replace(/</g, '\\u003c')`.
- [ ] **Step 4: Run** the unit test → PASS; `npm run check` → clean; `npm run build && npx vitest run tests/build` → the existing build tests still pass (the home page is unchanged).
- [ ] **Step 5: Stage** the six files.

### Task 3: The landing page component, its sections and routes

**Files:**
- Create: `src/components/pages/Landing.astro`
- Create: `src/components/landing/LandingHero.astro`, `Situations.astro`, `Offer.astro`, `Process.astro`, `Audiences.astro`, `Why.astro`, `Faq.astro`
- Create: `src/pages/services/[slug].astro`, `src/pages/[lang]/services/[slug].astro`
- Create: `src/content/landing/en/earth-observation-remote-sensing.md`, `src/content/landing/da/earth-observation-remote-sensing.md` (draft copy; see Task 4 for the text)
- Test: `tests/build/landing.test.ts`

**Interfaces:**
- Consumes: Task 1 loaders, Task 2 helper and props.
- `Landing.astro` props `{ lang: Lang; slug: string }`. Each section component takes `{ lang: Lang; data: <its slice of the front matter> }` plus what it needs (`LandingHero` also `lead: AstroComponent` and `title: string`; `Why` also the founder photo and `ui.about.portraitAlt`).
- Section ids, in order: `top`, `clients`, `situations`, `offer`, `process`, `audiences`, `why`, `faq`, `contact`. The hero's secondary button links to `#offer`; the primary and the header button to `#contact`.
- Routes: `getStaticPaths` from `getLandingSlugs()`; the `[lang]` route also filters `lang !== site.defaultLang` as the imprint route does.

Design of each section, following the home page component named:
- `LandingHero`: three rows as `Hero.astro` without the rotator and without `min-height: 100svh`: h1 (`.claim` size `--step-hero` at ≥48rem, else `--step-claim`), a `FieldWindow` band (`width={2560} height={224}`, height `clamp(9rem, 20vw, 16rem)`), then lead (`.lead`, `max-width: var(--measure)`) and two `Button`s.
- `Situations`: `.section`, `.claim` h2, `.lead` intro, then a grid of items (h3 `--step-title`, body `max-width: 30ch`), 2 columns ≥40rem, 4 columns ≥64rem, as `Approach.astro`'s principles grid on cream.
- `Offer`: `Services.astro`'s numbered two-by-two subgrid, verbatim styles, h2 `.signpost`.
- `Process`: `Approach.astro`'s blue band with its `FieldWindow` foot, steps numbered `01..` in `--on-accent`.
- `Audiences`: `Sectors.astro`'s `<details>` rows, first open, points list with the en-dash marker.
- `Why`: `.section`; `.claim` h2 and `.lead` intro across the top; below, `Portrait` (founder photo) in columns 1–5 and one column (7–12) with h3 + body and the quote `figure` styled as `About.astro`'s.
- `Faq`: `<details>` rows as `Audiences` but the panel is one `<p>` at `--measure`; h2 `.signpost`.

- [ ] **Step 1: Write the failing build test** `tests/build/landing.test.ts` reading `dist/services/earth-observation-remote-sensing/index.html` and the Danish page:
  - exactly one `h1`, its text equals the file's `title`;
  - `<title>` and `meta[name=description]` equal `meta.title` / `meta.description` (read the front matter with a tiny YAML split: `import matter from 'gray-matter'` is not installed, so parse with `js-yaml` from Astro's dependency tree if resolvable, otherwise assert against the literal strings of the content file);
  - section ids appear in the order above and each `section` has `aria-labelledby` pointing at an existing heading;
  - two extra JSON-LD blocks: `@type` `Service` with `url` equal to the canonical, and `FAQPage` with as many questions as the file's `faq.items`;
  - header `.button` href is `#contact`; the hero holds `a[href="#contact"]` and `a[href="#offer"]`;
  - no `[placeholder]` in the body text;
  - the sitemap contains `/services/earth-observation-remote-sensing/` and not `/da/services/`;
  - the Danish page has `lang="da-DK"`, `noindex`, and its switcher links to `/services/earth-observation-remote-sensing/`.
- [ ] **Step 2: Run** `npm run build && npx vitest run tests/build/landing.test.ts` → FAIL (page missing).
- [ ] **Step 3: Implement** the components, routes and the two content files.
- [ ] **Step 4: Run** `npm run check`, `npm run build`, `npx vitest run` → all pass, including `output.test.ts` on the new pages (CSP-clean, analytics last, nothing foreign).
- [ ] **Step 5: Stage** all files of the task.

### Task 4: Draft copy for the first page (template phase)

**Files:**
- Modify: `src/content/landing/en/earth-observation-remote-sensing.md`, `src/content/landing/da/earth-observation-remote-sensing.md`

Draft copy, written from the site's existing material (service "See what's there", sectors, founder text). It is structurally complete so the layout can be judged, and it is the starting point for the copy phase. Keyword placement: h1 "Earth observation and remote sensing", first sentence names satellite data processing, offer headings name the sub-services. Meta title ≤ 60 characters, description 140–160. Danish: a Danish draft of the same structure (the language is a draft and `noindex`).

- [ ] **Step 1:** Write both files. **Step 2:** `npm run build && npx vitest run` → PASS. **Step 3:** Stage.

### Task 5: Browser tests and screenshots

**Files:**
- Modify: `tests/e2e/a11y.spec.ts` (the landing page at 360 and 1280 with every row open: 0 violations), `tests/e2e/layout.spec.ts` (add the path to the overflow loop), `tests/e2e/languages.spec.ts` (switcher from the landing page leads to `/da/services/…` and back), `tests/e2e/nojs.spec.ts` (with JavaScript off, the audience and FAQ rows open on click and the hero band shows an `svg`).
- Create: `docs/screenshots/landing-eo-360.png`, `docs/screenshots/landing-eo-1280.png` (Chrome, reduced motion, full page).

- [ ] **Step 1:** Add the tests. **Step 2:** `npm run test:e2e -- --project=chrome` → all pass (WebKit too if time allows). **Step 3:** Take the screenshots with a Playwright script in the scratchpad and read them. **Step 4:** Stage.

### Task 6: README

**Files:**
- Modify: `README.md`: rewrite the `/services/[slug]` bullet under "A page" to describe the landing collection (one file per language, the fields, that both languages must exist, that the page is in the sitemap once the language is published); add the draft copy to the "To confirm" table.

- [ ] **Step 1:** Edit. **Step 2:** Stage. **Step 3:** Report to Niklas with the screenshots, the section list and the decisions; wait for approval before the copy phase.
