import { site, type Lang } from '../config/site';

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

/** Absolute URLs of a page in every locale, plus `x-default` (the default language). */
export function alternates<L extends string = Lang>(
  pathname: string,
  locales: LocaleTable<L> = site.locales as LocaleTable<L>,
  defaultLang: L = site.defaultLang as L,
): { hreflang: string; href: string }[] {
  const path = unlocalizePath(pathname, locales);
  const url = (lang: L) => new URL(localizePath(path, lang, locales), site.url).href;
  return [
    ...(Object.keys(locales) as L[]).map((lang) => ({ hreflang: locales[lang].hreflang, href: url(lang) })),
    { hreflang: 'x-default', href: url(defaultLang) },
  ];
}
