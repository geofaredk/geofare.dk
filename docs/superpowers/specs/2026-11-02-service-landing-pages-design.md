# Service landing pages: design

**Date:** 2 November 2026. **Branch:** `feature/service-landing-pages`.

## Intent

geofare's home page sells the company as a whole. Someone searching for "satellite data processing" or "remote sensing consultant" lands on a page about flood risk decisions and bounces. A service landing page meets that visitor on their own terms: one service, named the way they search for it, with enough depth to be worth reading and a clear way to get in touch.

The first page is **Earth observation and remote sensing**. The template must serve the other offerings later (flood modelling, risk communication, and so on) by adding one content file per language, with no new code.

## Goals

- Rank for the keyword family of the service (for the first page: *Earth observation*, *remote sensing*, *satellite data processing*, and their long-tail neighbours).
- Convert visitors who already know they need this service: one primary action (get in touch), repeated where attention peaks, never competing with itself.
- Read as geofare: the same type, colour, spacing, line field and tone of voice as the home page. A visitor moving between the two should feel they are in one place.
- Be a template: every word on the page comes from one content file per language. The page component knows the section order and the layout, nothing else.

## Non-goals

- No contact form, booking widget or chat. The site has none; the contact block (email, LinkedIn) is the conversion point.
- No new navigation entry yet. The pages are reached from search, from links in the Services section (a later, separate change) and by URL.
- No blog, case-study detail pages or downloads.
- No pricing.

## Anti-goals

- A page that reads like a generic agency template (stock icons, three cards with shadows, "Why choose us"). The brief forbids these and it would break the one-place feeling.
- Keyword stuffing. Keywords live in the h1, the first paragraph, section headings, the URL and the metadata, once each where it is natural.
- Copying the home page's sections verbatim. The landing page is more specific at every level.
- Motion beyond what the home page already has.

## Constraints (from the brief and the codebase)

- Content separate from layout: no user-facing string in a component. All copy in `src/content/`, company data in `src/config/site.ts`.
- Palette, type scale, buttons, tags, focus, hairline and motion rules of the home page, unchanged. No hex colour outside `tokens.css`.
- CSP-clean: no inline styles or scripts (JSON-LD is fine).
- Two languages: English at `/services/<slug>/`, Danish at `/da/services/<slug>/`. Danish is a draft language (noindex, out of the sitemap) until `draft: false`; a Danish file must still exist so the language switcher never leads to a 404.
- WCAG 2.2 AA, one h1, logical heading order, works without JavaScript, Lighthouse 95+ mobile, under 50 KB JS in total.
- Existing tests keep passing; the new page gets build tests of its own (metadata, structured data, section order, no placeholder leaks) and is added to the browser suites that iterate pages (axe, overflow).

## The page

URL: `/services/earth-observation-remote-sensing/`. Short enough, keyword-bearing, and under `/services/` where the README already reserved it.

Section order, top to bottom. Each line names the section's job in the conversion flow, its content, and the home page pattern it borrows.

1. **Hero** (promise). h1 with the service name and the outcome, a two-sentence lead, primary button "Get in touch" (to `#contact` on this page), secondary button to the offer section. The hero is shorter than the home page's (no 100svh), so the proof below it is visible on a laptop without scrolling. The line field stands behind it as on the home page, never behind text. Borrows: Hero (type and buttons), without the rotating headline.
2. **Clients** (proof, early). The existing logo stripe, directly below the hero. Borrows: Clients, unchanged, with the page's own title line.
3. **Situations** (problem recognition). Claim h2, a lead paragraph, then three or four short named situations the visitor will recognise ("You need to know how far the water reached", ...). Borrows: Approach's two-up/four-up grid of title + short text, on cream.
4. **Offer** (what you get). Signpost h2 ("What we do"), then a numbered list of the sub-services, each with title, text and tags. This is the keyword core of the page. Borrows: Services, numbered, two by two.
5. **Process** (how it works). The one blue band. Signpost h2, four steps, each a title and two lines. Borrows: Approach, including the field window along its foot.
6. **Who it is for** (relevance). Claim h2, lead, then openable rows per audience, each with one sentence naming their question and bullets naming what they get. Borrows: Sectors (`<details>` rows).
7. **Why geofare** (credibility). Claim h2, a lead, then the founder's photo in its field window beside a short text on the founder's background in this service and a quote. Borrows: About's spread, shortened.
8. **Questions** (objections). Signpost h2, openable rows, question as summary, answer as text. Also emitted as `FAQPage` structured data. Borrows: Sectors rows, one column of text.
9. **Contact** (conversion). The existing contact section with the page's own title and text, the email and LinkedIn blocks. Borrows: Contact, with the field band above it.

Header and footer as on every page. On a landing page the header's "Get in touch" button points at this page's `#contact`, not the home page's.

## Content model

One Markdown file per page and language: `src/content/landing/<lang>/<slug>.md`. The body below the front matter is the hero lead. Front matter:

```yaml
title: Earth observation and remote sensing      # h1
meta:
  title: ...                                     # <title>, 50 to 60 characters, keyword first
  description: ...                               # 140 to 160 characters
hero:
  primaryCta: Get in touch
  secondaryCta: See what we deliver
clients:
  title: ...
situations:
  title: ...
  intro: ...
  items: [{ title, body }]                       # 3 or 4
offer:
  title: ...
  items: [{ title, body, tags: [...] }]          # 3 to 6
process:
  title: ...
  steps: [{ title, body }]                       # 3 to 5
audiences:
  title: ...
  intro: ...
  items: [{ title, lead, points: [...] }]        # 3 to 6
why:
  title: ...
  intro: ...
  founder: { title, body }
  quote: ...
faq:
  title: ...
  items: [{ question, answer }]                  # 4 to 8
contact:
  title: ...
  body: ...
```

The schema is strict: a misspelt key stops the build, as for the other collections. Item texts are plain strings (no Markdown inside items), which keeps the file readable and the schema simple. A page is built for every language that has a file; the switcher links to the other language's page, so both files must exist.

## SEO

- `<title>` and `description` from the file. Canonical, `hreflang` alternates and Open Graph come from the base layout as today.
- Structured data on the page, next to the existing `ProfessionalService`: a `Service` (name, description, provider geofare, URL, `serviceType`) and a `FAQPage` from the questions. The base layout gets a prop for additional JSON-LD blocks.
- One h1. h2 per section, h3 per item. Keyword in h1, lead, offer headings and alt text where there is an image.
- The page is in the sitemap automatically (static route, not excluded). Danish stays out until Danish is published.
- Internal links: the header and footer link to the home page and its sections, as on every page. Links inside item texts are not needed for the first page (items are plain strings); the Services section of the home page will link to the page in a later change.
- No `BreadcrumbList`: the page shows no breadcrumb, and Google expects breadcrumb markup to mirror a visible one.

## CRO decisions

- One conversion action, "Get in touch", in the hero, the header and the contact section. The secondary button in the hero only moves the reader down the page.
- Proof before pitch: the client logos sit under the hero.
- Specific over superlative: every section names a concrete thing (a data set, a deliverable, a step), never "world class".
- Objections answered in the FAQ (cost, timeline, data access, what if we have no GIS team).
- The contact section asks for a decision, as on the home page, and the email is the biggest thing on the screen.

## Left to the builder

- Exact grid breakpoints of the new sections, following the home page's.
- Whether the hero reuses the hero canvas script or the lighter field window. Either is fine; choose the one with less JavaScript on the page.
- Test placement and naming, in the repo's style.
- The Danish file for the first page: real Danish is welcome, placeholder text acceptable, because the language is a draft.

## Two phases

1. **Template.** The collection, the route, the page component and its sections, tests, and the first page filled with draft copy: realistic enough to judge the layout, written from what the site already says about the service. Niklas approves the template on this.
2. **Copy.** The English text of the Earth observation page written for the audience (people who need satellite data processed and interpreted) and the keyword family; then the Danish file. The copy is drafted by Claude from the site's existing material and listed in the README under "To confirm", as the other wording written for the build is. Nothing is deployed between the phases, so the page needs no `noindex` while its copy is a draft.

## Decided by Claude, open to change

- Collection name `landing`, URL under `/services/`. These pages **replace** the service detail pages the README reserved at `/services/[slug]`; the README section is rewritten. The services collection builds no pages of its own, so the two sets of slugs cannot collide.
- Header CTA points at the page's own contact section.
- Items hold plain strings, not Markdown.
- Commits on this branch wait until the uncommitted Clients work on `main` (which the landing page's section 2 depends on) is committed, so that each commit stays reviewable. Niklas decides at the template checkpoint whether that work is finished.
