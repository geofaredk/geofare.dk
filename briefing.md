# geofare website: build brief for Claude Code

Oct 1, 2026 · @Niklas

Build a single-page marketing website for geofare, a small consultancy for natural hazards and climate risk. The copy in this brief is final and must be used word for word. The design is light, high-contrast and typographic, in the spirit of geodata.no, with a subtle animated background.

The site launches as one page. It must be built so that further pages, a blog and a Danish version can be added later without restructuring.

Done means: every section below is on the page with the given copy, the page meets the quality bar, and it runs from a Docker container.

## Design direction

The visual reference is [geodata.no](https://www.geodata.no). Open it before you start and study its layout, type scale, spacing and motion. Take the principles below. Do not copy its code, assets, images or text.

What to take from the reference:

- **Light and high-contrast.** Dark text and one saturated accent on a warm off-white ground.
- **Typography carries the page.** Very large headlines, generous line height, few weights.
- **Space separates sections.** Wide margins and white space instead of boxes, borders and cards with shadows.
- **One quiet background motion.** A slow line animation behind the hero, with a visible pause control.
- **Map-derived line graphics.** Thin line fragments as decoration between sections.
- **Large, simple link blocks.** Clear hover and focus states, no ornament.

What geofare does differently:

- No stock photos and no people photos at launch. Typography and the line animation carry the page.
- One accent colour only, used with confidence, including one full-width blue section for rhythm.
- One page with far less content, so every section gets room.

The page should feel pragmatic, practical, agile and innovative, not like a traditional consultancy. Avoid gradients, drop shadows, glass effects, stock icon sets, carousels and decorative illustrations.

## Brand

The palette is two brand colours plus one dark ink for text. Define them once as CSS custom properties and derive every tint from them.

| Token | Value | Use | Contrast |
| --- | --- | --- | --- |
| `--bg` | `#FCF2EB` | Page background |  |
| `--accent` | `#0047FF` | Headlines, links, buttons, animation lines, logo | 5.69:1 on `--bg` |
| `--ink` | `#0B1220` (suggested) | Body text | 16.98:1 on `--bg` |
| `--on-accent` | `#FCF2EB` | Text on the blue section | 5.69:1 on `--accent` |

The accent passes WCAG AA for text on the background, so it can be used for headlines and links. Set body text in the ink colour. Use no other hues.

**Logo**

- `brand-with-name.svg`: the square mark plus the wordmark "GEOFARE DANMARK", 1465 x 448. Use it in the header and the footer.
- `brand.svg`: the square mark alone, 229 x 229. Use it for the favicon, the social share image and small sizes.
- Both files are single-colour `#0047FF` on a transparent background. Niklas supplies them; place them in `src/assets/`.
- Do not redraw, recolour or distort them. On the blue section, use a copy with the fill set to `#FCF2EB`.
- The wordmark is set in capitals. In running text the name is always lowercase: geofare.

**Typography**

- The wordmark is a bold geometric sans. Choose an open-licence geometric sans for headlines that sits well beside it. Candidates: Outfit, Urbanist, Figtree. Test each next to the logo before deciding.
- Body text uses the same family or one neutral companion. Two families and four weights at most.
- Self-host the fonts as woff2. No font CDN.
- Suggested scale: hero headline `clamp(2.75rem, 7vw, 6rem)`, section claims `clamp(2rem, 4.5vw, 3.75rem)`, body `1.125rem` with line height 1.6.
- Headlines are in sentence case. Claims end with a full stop.

## Background animation

The concept is the logo in motion. The mark is a square of diagonal wave bands that read as water, contour lines and rock strata at once. The animation extends those bands across the hero as a field of thin lines that drift slowly along the same diagonal, like contour lines on a map as a water level rises and recedes.

**Look**

- Lines in the accent colour at 10 to 20 percent opacity on the cream background, stroke 1 to 1.5 px, no fills.
- The curves follow the rhythm of the logo's wave bands, so the hero and the mark look related.
- The lines fade out behind the hero text. Text contrast must never drop.
- Below the hero, static crops of the same line field can mark the transitions between sections.

**Motion**

- Slow and continuous. One full drift cycle takes at least 20 seconds.
- No sudden movement, no scroll-jacking, no parallax, no cursor-following.
- Optional: when the rotating hero ending changes, the line field shifts slightly, for example the lines rise a little on "when rivers overflow." Build this only if it stays subtle.

**Technique**

- Canvas 2D or generated SVG paths, driven by a noise field or layered sine bands. No video file and no 3D library.
- The animation module stays under 15 KB of JavaScript.
- Cap the frame rate at 30 fps. Pause when the tab is hidden or the hero is off screen.
- Handle resize and high-density displays. Draw fewer lines on small screens.

**Accessibility and fallback**

- With `prefers-reduced-motion: reduce`, render one static frame.
- Provide a visible pause and play button, as the reference site does.
- Mark the canvas `aria-hidden`.
- Without JavaScript, show a static SVG of the line field.

## Page structure

The page has eight parts in this order. The order answers four questions in turn: what, who, how, and for whom.

| # | Section | Anchor | Contains | Layout notes |
| --- | --- | --- | --- | --- |
| 1 | Header |  | Logo with name, anchor links, "Get in touch" button | Sticky and slim. Menu button on small screens. |
| 2 | Hero | `#top` | Rotating headline, sub-line, two buttons | Full viewport height. Animation behind. Pause control in a corner. |
| 3 | Services | `#services` | Four claim blocks with tags | Two by two on desktop, stacked on mobile. Number them 01 to 04 to show the sequence. Tags as small pills. |
| 4 | About | `#about` | Mission, founder portrait, quote, team | Mission as a large statement. Quote set apart. Leave room for a portrait photo later. |
| 5 | How we work | `#approach` | Four principles | The full-width blue section. Four columns on desktop. |
| 6 | Who we work with | `#sectors` | Intro plus seven client blocks | A list where each sector opens to show its sentence and bullets. All text stays in the HTML. |
| 7 | Contact | `#contact` | Claim, email link, LinkedIn link | No form at launch. |
| 8 | Footer |  | Logo, company details, privacy link | Quiet and small. |

Header navigation labels: Services, About, How we work, Who we work with. The button label is "Get in touch" and links to `#contact`.

Hero behaviour:

- The fixed part "Make good decisions" stays in place. Only the ending changes.
- The endings appear in the given order, about three seconds each, with a soft fade or slide.
- The rotation stops on "when it matters." and does not loop.
- The `h1` reads "Make good decisions when it matters." for screen readers, search engines and visitors without JavaScript. The rotating element is `aria-hidden`.
- With reduced motion, show the final sentence without rotation.

## Content

Use this copy word for word, in British English. If a line does not fit a layout, change the layout, not the line. Flag anything that looks wrong instead of fixing it.

### Hero

Headline, fixed part: **Make good decisions**

Rotating endings, in this order:

1. when the future is uncertain.
2. when rivers overflow.
3. when sea levels climb.
4. when risks multiply.
5. when it matters.

Sub-line: We turn satellite data, GIS and hydraulic modelling into risk information you can act on. Flood risk is where we go deepest.

Buttons: "Get in touch" (primary, to `#contact`) and "See what we do" (secondary, to `#services`).

### Services

**01. See what's there.** We use satellite observations, open geodata and your own records to build a clear picture of the ground as it is today. Tags: Earth observation, Geodata sourcing & integration, Geospatial analysis

**02. Know what's coming.** We model how water, weather and climate can hit your area, at the level of detail the decision needs. Tags: Flood modelling & hazard mapping, Climate hazard modelling

**03. Decide what comes first.** We assess what is at stake and rank the measures that make a difference, so your budget goes where the risk is. Tags: Flood risk assessment, Climate & multi-hazard risk assessment, Adaptation planning, Property flood resilience, Risk analytics for insurers & lenders

**04. Make risk make sense.** A risk nobody understands is a risk nobody acts on. We build the maps, visuals, tools and warnings that reach the people who have to act. Tags: Risk communication, Data visualisation & mapping, Early warning & alerts, Citizen engagement, Risk platforms & tools, Training & talks

### About

**Safer communities start with risk people understand.** geofare specialises in flood risk management, physical climate risk and other natural hazards. We use satellite data, GIS and hydraulic modelling to make risk information clear enough to act on.

**Founder-led. Hands-on.** geofare was founded by Niklas \[surname\], a geologist. He thinks in landscapes, works in data, and measures his work by what people do with it. He is as much at home in satellite imagery, maps and flood models as in the room where the decision gets made.

> "Too much good hazard science never reaches the people who have to decide. I started geofare to change that."

**A team built around your project.** You get Niklas, not an account manager. He leads every project and brings in the right specialists from our network when a job needs more hands. You always know who is doing the work.

### How we work

- **Start small.** A first answer early, then more detail where it pays off.
- **Open by default.** Open data and open tools wherever they do the job.
- **Yours to keep.** You get the data, the models and the tools, not only a PDF.
- **No layers.** You talk to the person doing the work.

### Who we work with

**Different sectors. Same question.** A municipality, a grid operator and a bank have little in common, until the water rises. Then they all ask the same thing: what can hit us, and what do we do about it? Here is how we answer it for each of them.

**Municipalities** You have to adapt, with a limited budget and residents watching.

- See where flood and climate risk is highest, and what to tackle first
- Get the models and maps your adaptation plan needs, and no more
- Explain the plan so residents get on board

**Emergency management** You need to know what is coming, who it hits and how to reach them.

- Scenarios you can plan and train with
- Warnings people understand and act on
- Maps and dashboards that work in an operations room, not only in a report

**Urban planners & developers** What you plan today stays for decades. Check the risk before it is built in.

- Flood modelling for your site or plan area
- Quick risk screening early, while changes are still cheap
- Visuals that make the risk clear to decision-makers and the public

**Housing associations & property owners** Your buildings cannot move, but their protection can improve.

- Flood risk per property, across your whole portfolio
- Practical measures, ranked by what to do first
- Plain information for residents and tenants

**Government & infrastructure** Your roads, rail and networks face conditions they were not built for.

- Risk assessments for assets and networks, across hazards
- Satellite and geodata monitoring for large areas
- Tools your own teams can run

**Finance & insurance** You need to know the physical risk in your portfolio, and show how you know.

- Portfolio screening for flood and climate hazards
- Risk down to the single address or asset
- Methods documented well enough for reporting and due diligence

**Energy & utilities** Your assets are long-lived, often exposed, and everyone depends on them.

- Hazard checks for new sites before you commit
- Risk assessments for plants and networks
- Adaptation plans for what is already built

### Contact

**Have a decision coming up?** Tell us what you need to know. We will tell you what it takes to find out.

Links: \[email address\] and \[LinkedIn URL\].

### Footer

geofare, \[street address\], \[postcode and town\], Denmark. CVR \[number\]. Privacy. © \[year\] geofare.

### Page metadata

- Title: geofare | Natural hazard and climate risk, clear enough to act on
- Description: geofare helps municipalities, planners and asset owners make good decisions about flood risk, physical climate risk and other natural hazards.

## Technical setup

Build a static site with Astro and TypeScript, keep all content in Markdown, and deliver it as a runnable Docker container. It ships one page now and is structured so that new pages and a second language are additions, not rewrites.

**Stack**

- Astro with static output. No server runtime and no database.
- Plain CSS with custom properties for the design tokens. No UI framework and no CSS framework.
- The hero rotation and the background animation are small vanilla TypeScript modules.
- `npm run build` produces static files in `dist/` that any web server, such as nginx, can serve.

**Docker**

- Deliver a multi-stage `Dockerfile`: a Node stage builds the site, and a small nginx stage serves `dist/`.
- The final image contains only nginx and the static files, and runs as a non-root user.
- Include an nginx config with compression, long cache headers for hashed assets, basic security headers and a custom 404 page.
- Include a `compose.yaml`, so `docker compose up -d` starts the site on one configurable port.
- The container serves plain HTTP. The reverse proxy on the server handles HTTPS.
- Add a health check.
- Updating content means editing a Markdown file, rebuilding the image and restarting the container. Document these commands in the README.

**Content separate from layout**

- Keep all copy in Markdown files under `src/content/`, not inside components. Structured fields such as tags, order and slug go in the front matter.
- Services, sectors and principles are collections. Adding a service or a sector means adding one entry.
- Navigation is generated from one config file, so an anchor link can become a page link later.

**Built to grow**

- Every page section is its own component, and the home page only composes them.
- A shared base layout holds the header, footer, metadata and tokens.
- Plan these routes, without building them yet: `/services/[slug]`, `/sectors/[slug]`, `/projects`, `/insights`, `/about`, `/privacy`.
- Each service and sector entry already has a slug, so its detail page can be generated later.

**Ready for Danish**

- English launches at `/`. Danish follows later at `/da/`.
- Keep every interface string and all copy in per-language content files.
- Set the `lang` attribute and prepare `hreflang` links.

**Search and sharing**

- Semantic HTML with one `h1` and a logical heading order.
- Title, description and Open Graph tags from the metadata in the content section.
- A share image built from the square mark on the cream background.
- `sitemap.xml`, `robots.txt` and JSON-LD of type `ProfessionalService`.

**Handover**

- A README that explains how to run and build the site, and how to add a section, a page and a language.

## Quality bar

The site is finished when it meets every line in this table.

| Area | Requirement |
| --- | --- |
| Accessibility | WCAG 2.2 AA. Full keyboard use, visible focus, a skip link, reduced-motion support and a pause control for the animation. |
| Contrast | Text contrast at least 4.5:1 everywhere, including text over the animation and on the blue section. |
| Performance | Lighthouse 95 or higher in all four categories on mobile. Under 50 KB of JavaScript, compressed. No layout shift when fonts load. |
| Privacy | No cookies and no third-party requests. No font CDN, tag manager, embedded video or map. No analytics at launch. |
| Responsive | Works from 360 px to 1920 px wide. Check at 360, 768, 1280 and 1920. |
| Browsers | The two latest versions of Chrome, Safari, Firefox and Edge. |
| Copy | Matches this brief word for word. |
| Deployment | The image builds from a clean checkout, the container starts with one command, and the site answers on the published port. |

Before handing over, take screenshots of the page at 360 px and 1280 px and check them against the design direction.

## Open points for Niklas

These need an answer from Niklas. Until then, Claude Code keeps the placeholders in square brackets visible and does not invent values.

- [ ] Animation: this brief was written without seeing geodata.no's background animation in motion. Confirm that "the logo in motion" is the effect you want, or describe what you like about theirs.
- [ ] Founder surname for the About section.
- [ ] Contact email address and LinkedIn URL.
- [ ] Footer details: street address and CVR number.
- [ ] The four "How we work" principles: confirm that each one is true for geofare.
- [ ] The team paragraph: confirm the wording "our network".
- [ ] New copy written for this brief: the contact section and the page metadata.
- [ ] Language: the logo reads "GEOFARE DANMARK" and the page is in English. Confirm English first, Danish later.
- [ ] Deployment: the container serves plain HTTP on one port and expects the reverse proxy on your server to handle HTTPS. Say so if the container should handle HTTPS itself.
- [ ] Text for the privacy page.
- [ ] Domain name for the canonical URL and the sitemap.
