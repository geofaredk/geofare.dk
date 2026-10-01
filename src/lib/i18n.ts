import { site, type Lang } from '../config/site';

const langs = Object.keys(site.locales) as Lang[];

/** Prefixes a site-relative href with the locale's path: `/#services` → `/da/#services` for Danish. */
export function localizePath(href: string, lang: Lang): string {
  const prefix = site.locales[lang].path;
  return prefix + href.replace(/^\//, '');
}

/** The language-neutral form of a pathname: `/da/privacy` → `/privacy`. */
function unlocalizePath(pathname: string): string {
  for (const lang of langs) {
    const prefix = site.locales[lang].path;
    if (prefix !== '/' && (pathname + '/').startsWith(prefix)) return '/' + pathname.slice(prefix.length);
  }
  return pathname;
}

/** Absolute URLs of a page in every locale, plus `x-default` (the default language). */
export function alternates(pathname: string): { hreflang: string; href: string }[] {
  const path = unlocalizePath(pathname);
  const url = (lang: Lang) => new URL(localizePath(path, lang), site.url).href;
  return [
    ...langs.map((lang) => ({ hreflang: site.locales[lang].hreflang, href: url(lang) })),
    { hreflang: 'x-default', href: url(site.defaultLang) },
  ];
}
