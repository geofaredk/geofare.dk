// Checks on the content files that the schemas in src/content.config.ts cannot express.
// Each one stops the build with a message naming the file, so a typo never ships as an
// empty heading, an empty paragraph or two items with the same number.
// Pure functions: no Astro imports, so the unit tests call them directly.

/** Sections with no heading of their own: the hero has its headline fields, the quote is a quote. */
const UNTITLED = new Set(['hero', 'about-quote']);
/** Sections that show only their title; their text is the list below them. */
const NO_BODY = new Set(['services', 'approach', 'clients']);

const isBlank = (value: string | undefined | null) => !value?.trim();

/** Other front-matter fields a section renders, which must not be empty either. */
const REQUIRED: Record<string, string[]> = { 'not-found': ['back'], newsletter: ['cta'] };

/** Throws if a section lacks the title, the text or another field that its page renders. */
export function checkSection(
  lang: string,
  id: string,
  data: { title?: string } & Record<string, unknown>,
  body: string | undefined,
): void {
  const file = `src/content/sections/${lang}/${id}.md`;
  if (!UNTITLED.has(id) && isBlank(data.title)) throw new Error(`${file} needs a title`);
  for (const key of REQUIRED[id] ?? []) {
    const value = data[key];
    if (typeof value !== 'string' || isBlank(value)) throw new Error(`${file} needs ${key}`);
  }
  if (!NO_BODY.has(id) && isBlank(body)) throw new Error(`${file} needs text below the front matter`);
}

/** Throws if two lab projects of one language share an `order`: each needs its own place in the grid. */
export function checkLab(lang: string, entries: { id: string; filePath?: string; data: { order: number } }[]): void {
  const seen = new Map<number, string>();
  for (const entry of entries) {
    const file = entry.filePath ?? `src/content/lab/${entry.id}.md`;
    const other = seen.get(entry.data.order);
    if (other) throw new Error(`src/content/lab/${lang}: ${other} and ${file} have the same order (${entry.data.order}); each needs its own`);
    seen.set(entry.data.order, file);
  }
}

interface ListEntry {
  id: string;
  filePath?: string;
  body?: string;
  data: { order: number; slug: string };
}

/**
 * Throws if an entry of a service, sector or principle list has no text, or if two entries
 * of one language share an `order` (both would show the same number) or a `slug`.
 */
export function checkList(collection: string, lang: string, entries: ListEntry[]): void {
  const file = (entry: ListEntry) => entry.filePath ?? `src/content/${collection}/${entry.id}.md`;
  for (const entry of entries) {
    if (isBlank(entry.body)) throw new Error(`${file(entry)} needs text below the front matter`);
  }
  for (const key of ['order', 'slug'] as const) {
    const seen = new Map<string, ListEntry>();
    for (const entry of entries) {
      const value = String(entry.data[key]);
      const other = seen.get(value);
      if (other) {
        throw new Error(
          `src/content/${collection}/${lang}: ${file(other)} and ${file(entry)} have the same ${key} (${value}); each needs its own`,
        );
      }
      seen.set(value, entry);
    }
  }
}

/**
 * Throws if a landing page exists in one language but not another: the language switcher on
 * every page leads to the same page in the other language, which must not be a missing page.
 * `ids` are the collection's entry ids, `<lang>/<slug>`.
 */
export function checkLanding(langs: string[], ids: string[]): void {
  const slugs = new Set(ids.map((id) => id.slice(id.indexOf('/') + 1)));
  for (const slug of slugs) {
    for (const lang of langs) {
      if (!ids.includes(`${lang}/${slug}`)) {
        throw new Error(`src/content/landing/${lang}/${slug}.md is missing: the page exists in another language, and every page needs every language`);
      }
    }
  }
}
