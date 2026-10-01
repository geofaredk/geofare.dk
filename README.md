# geofare website

The marketing site for geofare. It is a static site built with Astro and TypeScript. The build produces plain files in `dist/`, and a Docker image serves them with nginx. There is no server code and no database. The page is in English; Danish can be added later without changing the structure.

## Requirements

- Node 22.12 or newer (the repo pins 25.6.1 in `.nvmrc`)
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
npm run test:e2e     # browser tests (Playwright, needs Google Chrome); run npm run build first
npm run test:docker  # builds the image from the last commit and checks the running container
```

`npm run test:docker` uses what is committed, not your working files, and needs port 18080 to be free. It removes everything it starts.

## Deploy and update

From the repository root on the server:

```sh
docker compose up -d --build
```

This builds the image `geofare-website` and starts the container `geofare-web-1` (project `geofare`). It restarts by itself unless you stop it. Check it:

```sh
docker compose ps                    # STATUS shows "healthy" after a few seconds
curl http://localhost:8080/healthz   # prints: ok
```

**Port.** The container listens on 8080 inside. The host port is `GEOFARE_PORT` (default 8080).

**Domain.** `SITE_URL` sets the address used in the canonical link, `sitemap.xml` and `robots.txt`. It is read when the image is built, so changing it needs `--build`. Until it is set, the placeholder `https://geofare.example` is used.

Put both in a file named `.env` next to `compose.yaml` (Compose reads it by itself; git ignores it):

```sh
GEOFARE_PORT=8081
SITE_URL=https://www.example.dk
```

**Change the text and publish it.** Edit a Markdown file under `src/content/`, then:

```sh
docker compose up -d --build
```

That rebuilds the image and replaces the running container. Nothing else is needed.

**Stop it.**

```sh
docker compose down
```

**Reverse proxy.** The container serves plain HTTP only. Your proxy on the server handles HTTPS and forwards to the host port. The container sends no HSTS header, so set it in the proxy once HTTPS works. The container sets a strict Content Security Policy (scripts, styles, fonts and images from the site itself only). If you add a third-party script or embed later, change the policy in `docker/security-headers.conf`.

**What the container does.** It runs as a non-root user (uid 101), with a read-only root filesystem and no extra Linux capabilities. Hashed files in `/_astro/` are cached for a year, other files for a day, and HTML is revalidated on every visit. Missing pages return the custom 404 page with status 404.

## Where things live

| What | Where |
| --- | --- |
| All page text: sections, services, sectors, principles | `src/content/` |
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

The content folders are `src/content/sections/en/` (one file per block of text), `src/content/services/en/`, `src/content/sectors/en/` and `src/content/principles/en/`. Services, sectors and principles are ordered by `order` in the front matter.

The favicon, the Apple touch icon and the share image in `public/` are made from `src/assets/brand.svg`. To rebuild them, run `npm run brand-assets`.

## Add things

**A service or a sector.** Add one Markdown file to `src/content/services/en/` or `src/content/sectors/en/`. Copy an existing file and change it. The front matter needs `title`, `order` and `slug` (lower case, digits and hyphens). Services also need `tags`. The site picks the file up on the next build, with no code change. The slug is not used in a link yet; it is there so the detail page can be added later.

**A section on the home page.**

1. Add the text as `src/content/sections/en/<name>.md`, and add `<name>` to the `SectionId` list in `src/lib/content.ts`.
2. Add a component in `src/components/sections/`. Copy `Contact.astro` as a starting point.
3. Add one line to `src/components/pages/Home.astro`: import the component and put `<MySection lang={lang} />` where it should appear.
4. To add it to the menu, add an entry to `mainNav` in `src/config/navigation.ts`, the same id in the `NavItem` type there, the id under `nav:` in `src/content/ui/en.yaml`, and the id to the `nav` object in `src/content.config.ts`.

**A page.** Create a file in `src/pages/`; a file named `src/pages/projects.astro` becomes `/projects`. Copy `src/pages/privacy.astro` as a starting point: it uses the shared layout, so header, footer and metadata come with it. The routes planned for later are:

- `/services/[slug]` and `/sectors/[slug]`: add `src/pages/services/[slug].astro` and `src/pages/sectors/[slug].astro`. Every service and sector already has a `slug`, so each page can be generated from the collection with `getStaticPaths()`.
- `/projects`, `/insights`, `/about`: one page each in `src/pages/`.
- `/privacy` exists. Its text is in `src/content/sections/en/privacy.md`.

To turn a menu anchor into a page link, change its `href` in `src/config/navigation.ts`.

**A language (Danish at `/da/`).**

1. In `src/config/site.ts`, change the type to `export type Lang = 'en' | 'da';` and add this to `locales`: `da: { path: '/da/', htmlLang: 'da-DK', hreflang: 'da' }`. The Astro config and the `hreflang` links read the locale list from this file, so `astro.config.mjs` needs no change.
2. Copy each `en` folder to `da` inside `src/content/services/`, `sectors/`, `principles/` and `sections/`, and translate the files. Keep the file names and the `slug` values.
3. Copy `src/content/ui/en.yaml` to `src/content/ui/da.yaml` and translate it.
4. Add `src/pages/da/index.astro` with this content:

   ```astro
   ---
   import Home from '../../components/pages/Home.astro';
   ---

   <Home lang="da" />
   ```

5. Copy `src/pages/privacy.astro` to `src/pages/da/privacy.astro`, fix the import paths (one more `../`) and set `const lang = 'da';`.

Run `npm run build`. If a Danish section or interface file is missing, the build stops and names it. A missing service, sector or principle file does not stop the build, so check the page. The 404 page stays English; nginx serves one 404 page for the whole site.

## Open points

These still hold placeholders in square brackets. They stay visible on the site until you replace them.

| Open point | Where to fill it in |
| --- | --- |
| Founder surname | `src/content/sections/en/about-founder.md` (`[surname]`) |
| Email address | `src/config/site.ts` (`company.email`) |
| LinkedIn URL | `src/config/site.ts` (`company.linkedin`) |
| Street address | `src/config/site.ts` (`company.street`) |
| Postcode and town | `src/config/site.ts` (`company.postalTown`) |
| CVR number | `src/config/site.ts` (`company.cvr`) |
| Privacy text | `src/content/sections/en/privacy.md` (`[privacy text]`) |
| Domain for the canonical URL and sitemap | `SITE_URL` in `.env` (see Deploy) |

A real email address becomes a `mailto:` link, and a real LinkedIn URL becomes a link, on the next build. Both are also added to the structured data in the page head. The copyright year is the year of the build.

To confirm with the team, not fill in: the four "How we work" principles (`src/content/principles/en/`), the word "our network" in the team paragraph (`src/content/sections/en/about-team.md`), the new contact text (`src/content/sections/en/contact.md`) and the page metadata (`meta` in `src/content/ui/en.yaml`).

## Replace the portrait

The About section shows a crop of the line field where a photo of the founder will go. To use a photo:

1. Save it as `src/assets/founder.jpg` (portrait, 4:5 works best; any size above 960 px wide).
2. In `src/components/sections/About.astro`, add `import portrait from '../../assets/founder.jpg';` to the top, and change `<Portrait />` to `<Portrait src={portrait} alt="..." />` with a description of the photo as the alt text.

The photo fills the same 4:5 slot, and Astro makes the smaller sizes at build time. The alt text is typed into the component here; if you add Danish, move it into a content file with the rest of the copy.
