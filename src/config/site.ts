export type Lang = 'en' | 'da';

export interface Locale {
  /** Where the language lives: '/' for the default language, '/da/' for Danish. */
  path: string;
  htmlLang: string;
  hreflang: string;
  /** The language's own name and its short form, as shown in the language switcher. */
  name: string;
  short: string;
  /** A draft language is built and offered in the switcher, but kept out of search engines and the sitemap. */
  draft: boolean;
}

export const site = {
  name: 'geofare',
  // Open point in the brief: the real domain is not known yet. Override with SITE_URL at build time.
  url: process.env.SITE_URL ?? 'https://www.geofare.dk',
  defaultLang: 'en' as Lang,
  // Danish holds placeholder ("blind") copy for now, so it is a draft. Set `draft: false` once the real text is in.
  locales: {
    en: { path: '/', htmlLang: 'en-GB', hreflang: 'en', name: 'English', short: 'EN', draft: false },
    da: { path: '/da/', htmlLang: 'da-DK', hreflang: 'da', name: 'Dansk', short: 'DA', draft: true },
  } as Record<Lang, Locale>,
  // Cabin analytics (withcabin.com): the script every page loads, and where it reports to.
  // The Content Security Policy in docker/security-headers.conf names the same two hosts.
  analytics: {
    script: 'https://scripts.withcabin.com/hello.js',
    endpoint: 'https://ping.withcabin.com',
  },
  company: {
    street: '[street address]',
    postalTown: '[postcode and town]',
    cvr: '46811461',
    email: 'hej@geofare.dk',
    linkedin: 'https://www.linkedin.com/company/geofare',
  },
};
