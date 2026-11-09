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
export async function getLanding(lang: Lang, slug: string): Promise<CollectionEntry<'landing'>> {
  const entry = await getEntry('landing', `${lang}/${slug}`);
  if (!entry) throw new Error(`Missing landing page: src/content/landing/${lang}/${slug}.md`);
  if (!entry.body?.trim()) throw new Error(`src/content/landing/${lang}/${slug}.md needs text below the front matter (the hero's lead)`);
  return entry;
}

/** The slugs of the landing pages, each of which must exist in every language, so that the switcher never leads to a missing page. */
export async function getLandingSlugs(): Promise<string[]> {
  const ids = (await getCollection('landing')).map((entry) => entry.id);
  checkLanding(Object.keys(site.locales), ids);
  return [...new Set(ids.map((id) => id.slice(id.indexOf('/') + 1)))].sort();
}
