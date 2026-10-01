import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import type { Lang } from '../config/site';
import { checkList, checkSection } from './content-rules';

export type SectionId =
  | 'hero'
  | 'services'
  | 'about-mission'
  | 'about-founder'
  | 'about-quote'
  | 'about-team'
  | 'approach'
  | 'sectors'
  | 'contact'
  | 'privacy'
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
  checkSection(lang, id, entry.data.title, entry.body);
  return entry;
}

async function getList<C extends ListCollection>(collection: C, lang: Lang): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection, (entry) => entry.id.startsWith(`${lang}/`));
  checkList(collection, lang, entries);
  return entries.sort((a, b) => a.data.order - b.data.order);
}

export const getServices = (lang: Lang) => getList('services', lang);
export const getSectors = (lang: Lang) => getList('sectors', lang);
export const getPrinciples = (lang: Lang) => getList('principles', lang);
