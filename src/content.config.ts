import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Entry ids are `<lang>/<name>` (the file path without extension). The glob loader would
// otherwise use the `slug` front matter as the id, which would collide across languages.
const byLanguage = (base: string, pattern = '*/*.md') =>
  glob({ base: `./src/content/${base}`, pattern, generateId: ({ entry }) => entry.replace(/\.[^.]+$/, '') });

const listEntry = z.strictObject({
  title: z.string(),
  order: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});

const services = defineCollection({
  loader: byLanguage('services'),
  schema: listEntry.extend({ tags: z.array(z.string()).min(1) }),
});

const sectors = defineCollection({ loader: byLanguage('sectors'), schema: listEntry });

const principles = defineCollection({ loader: byLanguage('principles'), schema: listEntry });

// Strict: a misspelt key (`tittle:`) stops the build instead of being dropped. Which sections
// need a title or text is checked in src/lib/content-rules.ts, when a page asks for the section.
const sections = defineCollection({
  loader: byLanguage('sections'),
  schema: z.strictObject({
    title: z.string().optional(),
    // hero
    fixed: z.string().optional(),
    endings: z.array(z.string()).min(1).optional(),
    primaryCta: z.string().optional(),
    secondaryCta: z.string().optional(),
    // not-found
    back: z.string().optional(),
  }),
});

const ui = defineCollection({
  loader: byLanguage('ui', '*.yaml'),
  schema: z.object({
    meta: z.object({ title: z.string(), description: z.string(), imageAlt: z.string() }),
    nav: z.object({
      label: z.string(),
      services: z.string(),
      about: z.string(),
      approach: z.string(),
      sectors: z.string(),
      lab: z.string(),
      contact: z.string(),
      menuOpen: z.string(),
      menuClose: z.string(),
    }),
    skip: z.string(),
    home: z.string(),
    lang: z.object({ label: z.string() }),
    lab: z.object({ newTab: z.string() }),
    about: z.object({ portrait: z.string(), portraitAlt: z.string() }),
    footer: z.object({ cvr: z.string(), imprint: z.string() }),
  }),
});

// The lab: geofare's own projects, one file each. The file name is the slug; the text below the
// front matter stays empty for now and is reserved for a detail page at /lab/[slug].
const lab = defineCollection({
  loader: byLanguage('lab'),
  schema: ({ image }) =>
    z.strictObject({
      title: z.string().min(1),
      description: z.string().min(1).max(220, '220 characters at most'),
      url: z.string().regex(/^https:\/\/\S+$/, 'a full https address'),
      order: z.number().int().positive(),
      // A local image file, optimised at build time; never a remote address.
      thumbnail: image().optional(),
      thumbnailAlt: z.string().optional(),
      tags: z.array(z.string().min(1)).max(3, 'three at most').optional(),
      status: z.string().min(1).optional(),
    }),
});

export const collections = { services, sectors, principles, sections, ui, lab };
