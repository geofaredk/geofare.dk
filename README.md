# geofare website

The marketing site for geofare. It is a static site built with Astro and TypeScript. The build produces plain files in `dist/`, and a Docker image serves them with nginx. There is no server code and no database. The page is in English; Danish can be added later without changing the structure.

## Requirements

- Node 22.12 or newer; `.nvmrc` names 24, the version the Docker build uses
- Docker with Compose, to build and run the container

## Run it locally

```sh
npm install
npm run dev
```

The site opens at http://localhost:4321. Edits to content and code show up straight away.

## Build and test

```sh
npm run build        # writes the site to dist/
npm run preview      # serves dist/ at http://localhost:4321
npm run check        # type-checks the code and the content
npm test             # builds, then runs the unit and build tests (Vitest)
npm run test:e2e     # builds, then runs the browser tests in Chrome and WebKit (Playwright)
npm run test:e2e:firefox          # builds, then runs the same tests in Firefox
npm run test:e2e:firefox:docker   # the Firefox tests in Docker, for when Firefox does not start (see below)
npm run test:docker  # builds the image from the last commit and checks the running container
npm run lighthouse -- http://localhost:8080   # Lighthouse (mobile) three times against a running site
```

**Browser tests.** `npm run test:e2e` runs Google Chrome (installed on the computer) and WebKit, the engine of Safari. Install WebKit and Firefox for Playwright once with `npx playwright install firefox webkit`. Every run rebuilds the site and starts its own server on port 4321; if that port is taken, the run stops. Run one browser with `npx playwright test --project=chrome` (or `webkit`, `firefox`) after `npm run build`. To test a site that is already running, such as the container, set its address: `E2E_BASE_URL=http://localhost:8080 npx playwright test --project=chrome`.

**Firefox.** Firefox has its own command, because Playwright's Firefox 155 does not start on macOS 27 ("Could not find profile folder."); where it does start, use `npm run test:e2e:firefox`. `npm run test:e2e:firefox:docker` instead builds the site from your working files into a container of its own (compose project `geofare-e2e`, image `geofare-website-e2e`, port `E2E_PORT`, default 18082) and runs the Firefox tests in Playwright's Linux image (`mcr.microsoft.com/playwright:v<installed version>-noble`) against it. It refuses to start if a container or image of that name already exists, and removes the site container, its network and its image afterwards. It does not remove the Playwright image (about 2.5 GB), which it pulls on first use; remove it yourself with `docker image rm mcr.microsoft.com/playwright:v1.63.0-noble` when you no longer need it.

`npm run test:docker` uses what is committed, not your working files, and needs port 18080 to be free. It removes everything it starts.

If port 18080 or 18082 is taken, choose another: `SMOKE_PORT=18090 npm run test:docker` and `E2E_PORT=18092 npm run test:e2e:firefox:docker`.

`npm run lighthouse` needs Google Chrome and a running site; point it at the container, because compression and cache headers count. It prints the four scores of the median run, layout shift, load times and page weight, keeps the reports in `.lighthouse/`, and fails if a score is below 95. `docs/quality-report.md` has the latest measurements against the brief's quality bar and the commands to repeat them.

## Deploy and update

Run everything from the repository root on the server.

**1. Choose the port and the domain.** The container listens on 8080 inside. The host port is `GEOFARE_PORT` (default 8080). Pick a free host port: if something else on the server already uses 8080, you must set `GEOFARE_PORT`. `SITE_URL` sets the address used in the canonical link, `sitemap.xml` and `robots.txt`. It is read when the image is built, so changing it needs `--build`. Until it is set, the placeholder `https://geofare.example` is used.

Put both in a file named `.env` next to `compose.yaml` (Compose reads it by itself; git ignores it):

```sh
GEOFARE_PORT=8081
SITE_URL=https://www.example.dk
```

**2. Build and start.**

```sh
docker compose up -d --build
```

This builds the image `geofare-website` and starts the container `geofare-web-1`. It restarts by itself unless you stop it. The compose project is named `geofare` on purpose, so these commands never touch containers of other projects, whatever the folder is called. Check it, using your `GEOFARE_PORT` (8080 if you did not set one):

```sh
docker compose ps                     # STATUS reads "starting" for up to 30 seconds, then "healthy"
curl http://localhost:8081/healthz    # prints: ok
```

**Change the text and publish it.** Edit a Markdown file under `src/content/`, then:

```sh
docker compose up -d --build
```

That rebuilds the image and replaces the running container. Nothing else is needed to publish.

The tests check the page text against `tests/fixtures/copy.en.json`, which holds the wording of the brief. Filling in a placeholder such as `[surname]` or `[email address]` needs no change to the tests. If you change the wording on purpose, change the same text in that file in the same commit, or `npm test` and `npm run test:e2e` will fail.

Titles in the front matter (between the `---` lines) are used as typed: type the typographic apostrophe (’) yourself, as in `title: See what’s there.`. In the text below the front matter, straight quotes and apostrophes are turned into typographic ones automatically.

**Stop it.**

```sh
docker compose down
```

**Reverse proxy.** The container serves plain HTTP only. Your proxy on the server handles HTTPS and forwards to the host port. By default Docker publishes that port on every network interface of the server, so the plain-HTTP site can also be reached directly on it from outside unless a firewall blocks it. If the proxy runs on the same server, you can publish the port to the server itself only, by changing the `ports` line in `compose.yaml` to:

```yaml
    ports:
      - "127.0.0.1:${GEOFARE_PORT:-8080}:8080"
```

The container sends no HSTS header, so set it in the proxy once HTTPS works. The container sets a strict Content Security Policy: scripts, styles, fonts and images from the site itself only, plus the Cabin analytics script and the address it reports to. If you add another third-party script or embed later, change the policy in `docker/security-headers.conf`.

**Analytics.** Every page of the built site loads Cabin (`https://scripts.withcabin.com/hello.js`), as the last thing before `</body>`; it reports page views to `https://ping.withcabin.com`. Both addresses are in `src/config/site.ts` under `analytics`, the script tag is in `src/layouts/Base.astro`, and the policy above allows exactly these two hosts. The script sets no cookies and stores nothing in the browser (checked in `tests/e2e/privacy.spec.ts`). It is left out of `npm run dev`, so working on the site is not counted as visits; `npm run preview` and the container do load it. The browser tests and `npm run lighthouse` keep its reports from leaving. To remove analytics, delete the script line in `Base.astro`, the `analytics` entry in `site.ts`, and the two Cabin addresses in `docker/security-headers.conf` and `tests/docker/smoke.sh`.

**What the container does.** It runs as a non-root user (uid 101), with a read-only root filesystem and no extra Linux capabilities. Hashed files in `/_astro/` are cached for a year, other files for a day, and HTML is revalidated on every visit. Missing pages return the custom 404 page with status 404.

## Where things live

| What | Where |
| --- | --- |
| All page text: sections, services, sectors, principles, lab projects | `src/content/` |
| Interface text (menu, buttons, footer labels) and page metadata (title, description, share-image text) | `src/content/ui/en.yaml` |
| Company details: name, address, CVR number, email, LinkedIn, domain | `src/config/site.ts` |
| Menu links | `src/config/navigation.ts` |
| Content schemas (what front matter is allowed) | `src/content.config.ts` |
| One component per page section | `src/components/sections/` |
| The home page, which only lists the sections in order | `src/components/pages/Home.astro` |
| Header, footer, metadata, JSON-LD | `src/layouts/Base.astro` |
| Colours, type sizes, spacing | `src/styles/tokens.css` |
| Pages and routes | `src/pages/` |
| Docker and nginx | `Dockerfile`, `compose.yaml`, `docker/` |
| Logo files | `src/assets/` |

The content folders are `src/content/sections/en/` (one file per block of text), `src/content/services/en/`, `src/content/sectors/en/`, `src/content/principles/en/` and `src/content/lab/en/` (the projects in the Lab section). Each has the same folder for Danish (`da`). Services, sectors and principles are ordered by `order` in the front matter.

The favicon, the Apple touch icon and the share image in `public/` are made from `src/assets/brand.svg`. To rebuild them, run `npm run brand-assets`.

## Add things

**A service or a sector.** Add one Markdown file to `src/content/services/en/` or `src/content/sectors/en/`. Copy an existing file and change it. The front matter needs `title`, `order` and `slug` (lower case, digits and hyphens). Services also need `tags`. No two files in one folder may have the same `order` or `slug`; the build stops and names both files if they do. It also stops, naming the file, if any content file has a misspelt front-matter key, if a section file lacks the title its section shows (or, for the 404 page, the button text `back`), or if a file has no text where its section shows text. The site picks the file up on the next build, with no code change. The slug is not used in a link yet; it is there so the detail page can be added later.

**A project in the Lab section.** Add one Markdown file to `src/content/lab/en/`; its file name is the project's slug. Only the front matter is used; leave the text below it empty (it is reserved for a detail page at `/lab/[slug]` later).

```md
---
title: FloodReady.dk
description: One or two sentences, 220 characters at most.
url: https://floodready.dk
order: 1
thumbnail: ../../../assets/lab/floodready.png
thumbnailAlt: What the picture shows
tags:
  - Flood risk
  - Risk communication
status: Launching soon
---
```

`title`, `description`, `url` (a full `https` address) and `order` (the place in the grid) are required. The rest is optional: `thumbnail` is a picture in `src/assets/lab/`, given as a path from the Markdown file and shown cropped to 16:10 (leave `thumbnailAlt` out if the picture is decoration); up to three `tags`; and a short `status` such as "Launching soon", shown as a pill above the title, which you remove once it no longer holds. Without a thumbnail the card shows a crop of the line pattern. The build stops, naming the file and the field, if the description is longer than 220 characters, the address is not `https`, there are more than three tags, a key is misspelt, or two projects of one language have the same `order`. The section's title and intro are in `src/content/sections/en/lab.md`. For Danish, add a file of the same name to `src/content/lab/da/`.

**A section on the home page.**

1. Add the text as `src/content/sections/en/<name>.md`, and add `<name>` to the `SectionId` list in `src/lib/content.ts`.
2. Add a component in `src/components/sections/`. Copy `Contact.astro` as a starting point.
3. Add one line to `src/components/pages/Home.astro`: import the component and put `<MySection lang={lang} />` where it should appear.
4. To add it to the menu, add an entry to `mainNav` in `src/config/navigation.ts`, the same id in the `NavItem` type there, the id under `nav:` in `src/content/ui/en.yaml`, and the id to the `nav` object in `src/content.config.ts`.

**A page.** Create a file in `src/pages/`; a file named `src/pages/projects.astro` becomes `/projects`. Copy `src/pages/imprint.astro` as a starting point: it uses the shared layout, so header, footer and metadata come with it. The routes planned for later are:

- `/services/[slug]` and `/sectors/[slug]`: add `src/pages/services/[slug].astro` and `src/pages/sectors/[slug].astro`. Every service and sector already has a `slug`, so each page can be generated from the collection with `getStaticPaths()`.
- `/projects`, `/insights`, `/about`: one page each in `src/pages/`.
- `/imprint` exists. Its text is in `src/content/sections/en/imprint.md`. A privacy page, if one is needed later, is one more page in `src/pages/`.

To turn a menu anchor into a page link, change its `href` in `src/config/navigation.ts`.

**Languages.** The site has two: English at `/` and Danish at `/da/`. The language switcher in the main menu (EN, DA) leads to the same page in the other language. The languages are listed in `src/config/site.ts` under `locales`.

Danish is a **draft** for now. Its menu, buttons and other interface text are translated (`src/content/ui/da.yaml`), but the page copy in `src/content/*/da/` is placeholder text (lorem ipsum, one word for each English word). A draft language is built and reachable through the switcher, but every page of it carries `noindex`, and it is left out of the sitemap and of the `hreflang` links, so search engines never see the placeholder text.

To publish a language:

1. Replace the placeholder text in its files under `src/content/services/`, `sectors/`, `principles/`, `sections/` and `lab/` with the real translation. Keep the file names, and `order` and `slug` as they are.
2. Check the interface text in `src/content/ui/<language>.yaml`; the translations there were written for the build and should be confirmed (see "To confirm" below).
3. In `src/config/site.ts`, set `draft: false` for that language. From the next build it is indexed, listed in the sitemap, and linked from the other languages with `hreflang`.

To add a further language: add it to the `Lang` type and to `locales` in `src/config/site.ts`, copy each `en` content folder and `src/content/ui/en.yaml` under the new language code, and translate. The pages come from `src/pages/[lang]/`, which builds the home page and the imprint for every language in the list, so no page file is needed. If a section or interface file is missing, the build stops and names it. A missing service, sector, principle or project file does not stop the build, so check the page.

The 404 page exists once, in English; from it the switcher leads to the other language's home page. The copy tests check the English text only.

## Open points

These still hold placeholders in square brackets. They stay visible on the site until you replace them.

| Open point | Where to fill it in |
| --- | --- |
| Founder surname | `src/content/sections/en/about-founder.md` (`[surname]`) |
| Email address | `src/config/site.ts` (`company.email`) |
| LinkedIn URL | `src/config/site.ts` (`company.linkedin`) |
| Street address (not shown on the page; used in the structured data once real) | `src/config/site.ts` (`company.street`) |
| Postcode and town (not shown on the page; used in the structured data once real) | `src/config/site.ts` (`company.postalTown`) |
| CVR number | `src/config/site.ts` (`company.cvr`) |
| Imprint text | `src/content/sections/en/imprint.md` (`[imprint text]`) |
| Domain for the canonical URL and sitemap | `SITE_URL` in `.env` (see Deploy) |

A real email address becomes a `mailto:` link, and a real LinkedIn URL becomes a link, on the next build. Both are also added to the structured data (JSON-LD) in the page head. So are a real street address (`streetAddress`) and postcode and town: written the Danish way, "8000 Aarhus C", they become `postalCode` and `addressLocality`; written any other way, the whole value becomes `addressLocality`. A value still in square brackets never reaches the structured data. The copyright year is the year of the build.

Filling in these points needs no change to the tests: they accept either the placeholder or a real value in its place (see "Change the text and publish it").

**The imprint page** is kept out of search engines until its text is written: it carries `noindex`, and it is left out of the sitemap. When the text is in, change both: remove `noindex` from `<Base … noindex>` in `src/pages/imprint.astro`, and remove `'/imprint'` from `excludedFromSitemap` in `astro.config.mjs`. Then update the two checks in `tests/build/seo.test.ts` that expect it to be left out.

To confirm with the team, not fill in: the four "How we work" principles (`src/content/principles/en/`), the word "our network" in the team paragraph (`src/content/sections/en/about-team.md`), the new contact text (`src/content/sections/en/contact.md`) and the page metadata (`meta` in `src/content/ui/en.yaml`).

### To confirm: wording written for the build

The brief does not give these words; they were written so the site works. Change them where listed if the team prefers other wording.

| Wording | Where it is shown | File |
| --- | --- | --- |
| "The geofare mark" | Description of the share image (`meta.imageAlt`) | `src/content/ui/en.yaml` |
| "Niklas, the founder of geofare, smiling, in a cap and round glasses" | Description of the founder photo for screen readers (`about.portraitAlt`) | `src/content/ui/en.yaml` |
| "Page not found", "This page does not exist.", "Back to the home page" | The 404 page | `src/content/sections/en/not-found.md` |
| "Skip to content" | Skip link, shown on the first Tab | `src/content/ui/en.yaml` (`skip`) |
| "Menu", "Close" | Menu button on small screens | `src/content/ui/en.yaml` (`nav.menuOpen`, `nav.menuClose`) |
| "Main navigation" | Name of the menu for screen readers | `src/content/ui/en.yaml` (`nav.label`) |
| "geofare home" | Name of the header logo link for screen readers | `src/content/ui/en.yaml` (`home`) |
| "Language" | Name of the language switcher for screen readers | `src/content/ui/en.yaml` (`lang.label`) |
| "(opens in a new tab)" | Read out after each project link in the Lab section | `src/content/ui/en.yaml` (`lab.newTab`) |
| All Danish interface text, including the headings "Ydelser", "Sådan arbejder vi", "Kolofon" | Menu, buttons, labels and three section headings in the draft language | `src/content/ui/da.yaml`; `src/content/sections/da/` |

## Replace the portrait

The About section shows a window onto the moving line field, and overlapping its upper right the founder's photo, `src/assets/founder.png`. To use another photo, save it under that name (portrait, 4:5 works best, at least 640 px wide; the box crops whatever does not fit) and rebuild. For a file with another name or type, change the `import founderPhoto from …` line in `src/components/sections/About.astro`. The photo's description for screen readers is in `src/content/ui/en.yaml` (`about.portraitAlt`); change it when the photo changes.

Without a photo (remove `src={founderPhoto}` from `<Portrait … />`) the box is a tinted placeholder showing the words in `about.portrait`.

Astro makes the smaller sizes at build time. The size and position of the window and of the picture are set in `src/components/Portrait.astro` (`.portrait__window`, `.portrait__picture`).

The same window onto the moving field is used for the band at the foot of the blue section and the band above Contact. It is one component, `src/components/FieldWindow.astro`: put `<FieldWindow width={…} height={…} class="…" />` anywhere, size it with CSS, and set `--field-line` and `--field-opacity` on it to change the lines' colour and strength. The `width` and `height` are those of the still drawing shown without JavaScript.
