import { site, type Anchor, type Lang, type Route } from '../config/site';

/** The part of `site.locales` these helpers read. Tests pass their own table, such as one with Danish. */
type LocaleTable<L extends string> = Record<L, { path: string; hreflang: string }>;

/** Prefixes a site-relative href with the locale's path: `/#services` → `/da/#services` for Danish. */
export function localizePath<L extends string = Lang>(
  href: string,
  lang: L,
  locales: LocaleTable<L> = site.locales as LocaleTable<L>,
): string {
  const prefix = locales[lang].path;
  return prefix + href.replace(/^\//, '');
}

/** The language-neutral form of a pathname: `/da/privacy` → `/privacy`. */
function unlocalizePath<L extends string>(pathname: string, locales: LocaleTable<L>): string {
  for (const lang of Object.keys(locales) as L[]) {
    const prefix = locales[lang].path;
    if (prefix !== '/' && (pathname + '/').startsWith(prefix)) return '/' + pathname.slice(prefix.length);
  }
  return pathname;
}

/** The same page in another language: `/imprint/` → `/da/imprint/` for Danish, and back for English. */
export function switchPath<L extends string = Lang>(
  pathname: string,
  lang: L,
  locales: LocaleTable<L> = site.locales as LocaleTable<L>,
): string {
  return localizePath(unlocalizePath(pathname, locales), lang, locales);
}

/** The languages search engines are told about: every locale that is not a draft. */
export function publishedLocales(): LocaleTable<string> {
  return Object.fromEntries(Object.entries(site.locales).filter(([, locale]) => !locale.draft));
}

/**
 * The path of a page that has its own word in each language's URL: `routePath('imprint', 'da')` is
 * `/da/kolofon/`, `routePath('services', 'da', slug)` is `/da/ydelser/<slug>/`. Always with a trailing slash.
 */
export function routePath(route: Route, lang: Lang, slug?: string): string {
  const word = site.locales[lang].routes[route];
  return localizePath(`/${word}/${slug ? slug + '/' : ''}`, lang);
}

/** The id of a section in the language: `anchorId('services', 'da')` is `ydelser`. */
export function anchorId(anchor: Anchor, lang: Lang): string {
  return site.locales[lang].anchors[anchor];
}

/** The home page link to a section, in the language: `anchorPath('services', 'da')` is `/da/#ydelser`. */
export function anchorPath(anchor: Anchor, lang: Lang): string {
  return localizePath(`/#${anchorId(anchor, lang)}`, lang);
}

/** Absolute URLs of a page in every published locale, plus `x-default` (the default language), when the path is the same in every language. */
export function alternates<L extends string = Lang>(
  pathname: string,
  locales: LocaleTable<L> = publishedLocales() as LocaleTable<L>,
  defaultLang: L = site.defaultLang as L,
): { hreflang: string; href: string }[] {
  const path = unlocalizePath(pathname, locales);
  const paths = Object.fromEntries((Object.keys(locales) as L[]).map((lang) => [lang, localizePath(path, lang, locales)])) as Record<L, string>;
  return alternatesFor(paths, locales, defaultLang);
}

/** The same, from one path per language, for pages whose URL differs between languages. Languages not in `locales` (drafts) are left out. */
export function alternatesFor<L extends string = Lang>(
  paths: Partial<Record<L, string>>,
  locales: LocaleTable<L> = publishedLocales() as LocaleTable<L>,
  defaultLang: NoInfer<L> = site.defaultLang as L,
): { hreflang: string; href: string }[] {
  const url = (lang: L) => new URL(paths[lang]!, site.url).href;
  return [
    ...(Object.keys(locales) as L[]).filter((lang) => paths[lang]).map((lang) => ({ hreflang: locales[lang].hreflang, href: url(lang) })),
    { hreflang: 'x-default', href: url(defaultLang) },
  ];
}
