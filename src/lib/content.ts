import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { site, type Lang } from '../config/site';
import { checkLab, checkLanding, checkList, checkSection } from './content-rules';

export type SectionId =
  | 'hero'
  | 'services'
  | 'about-mission'
  | 'about-founder'
  | 'about-quote'
  | 'about-team'
  | 'clients'
  | 'approach'
  | 'sectors'
  | 'lab'
  | 'contact'
  | 'newsletter'
  | 'imprint'
  | 'not-found';

type ListCollection = 'services' | 'sectors' | 'principles';

export async function getUi(lang: Lang): Promise<CollectionEntry<'ui'>['data']> {
  const entry = await getEntry('ui', lang);
  if (!entry) throw new Error(`Missing UI strings: src/content/ui/${lang}.yaml`);
  return entry.data;
}

export async function getSection(lang: Lang, id: SectionId): Promise<CollectionEntry<'sections'>> {
  const entry = await getEntry('sections', `${lang}/${id}`);
  if (!entry) throw new Error(`Missing section: src/content/sections/${lang}/${id}.md`);
  checkSection(lang, id, entry.data, entry.body);
  return entry;
}

async function getList<C extends ListCollection>(collection: C, lang: Lang): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection, (entry) => entry.id.startsWith(`${lang}/`));
  checkList(collection, lang, entries);
  return entries.sort((a, b) => a.data.order - b.data.order);
}

/** The lab projects of a language, in grid order. The slug of each is its file name. */
export async function getLab(lang: Lang): Promise<(CollectionEntry<'lab'> & { slug: string })[]> {
  const entries = await getCollection('lab', (entry) => entry.id.startsWith(`${lang}/`));
  checkLab(lang, entries);
  return entries.sort((a, b) => a.data.order - b.data.order).map((entry) => ({ ...entry, slug: entry.id.slice(lang.length + 1) }));
}

/** The clients of the logo stripe, in order. Two with the same order would be a silent swap, so that stops the build. */
export async function getClients(): Promise<CollectionEntry<'clients'>[]> {
  const entries = await getCollection('clients');
  checkLab('clients', entries.map((entry) => ({ ...entry, filePath: entry.filePath ?? `src/content/clients/${entry.id}.md` })));
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export const getServices = (lang: Lang) => getList('services', lang);
export const getSectors = (lang: Lang) => getList('sectors', lang);
export const getPrinciples = (lang: Lang) => getList('principles', lang);

/** A service landing page in one language. The body of the file is the hero's lead and must not be empty. */
/** A landing page by its file name (`name`, the same in every language), in one language. */
export async function getLanding(lang: Lang, name: string): Promise<CollectionEntry<'landing'>> {
  const entry = await getEntry('landing', `${lang}/${name}`);
  if (!entry) throw new Error(`Missing landing page: src/content/landing/${lang}/${name}.md`);
  if (!entry.body?.trim()) throw new Error(`src/content/landing/${lang}/${name}.md needs text below the front matter (the hero's lead)`);
  return entry;
}

export interface LandingPage {
  /** The file name without `.md`, shared by the languages. */
  name: string;
  lang: Lang;
  /** The last part of the URL in this language: the file's `slug`, or the file name. */
  slug: string;
}

/**
 * Every landing page in every language. A page must exist in every language, so that the switcher
 * never leads to a missing page; two files of one language may not share a slug.
 */
export async function getLandingPages(): Promise<LandingPage[]> {
  const entries = await getCollection('landing');
  checkLanding(
    Object.keys(site.locales),
    entries.map((entry) => entry.id),
  );
  const pages = entries
    .map((entry) => {
      const [lang, name] = [entry.id.slice(0, entry.id.indexOf('/')) as Lang, entry.id.slice(entry.id.indexOf('/') + 1)];
      return { name, lang, slug: entry.data.slug ?? name };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.lang.localeCompare(b.lang));
  for (const page of pages) {
    const twin = pages.find((other) => other !== page && other.lang === page.lang && other.slug === page.slug);
    if (twin) throw new Error(`src/content/landing/${page.lang}/${page.name}.md and ${twin.name}.md share the slug "${page.slug}"`);
  }
  return pages;
}
