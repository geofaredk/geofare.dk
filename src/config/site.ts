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
  // Umami analytics, self-hosted at umami.geofare.dk: the script every page loads, the site it
  // counts for, and where the script reports to (always /api/send next to the script).
  // The Content Security Policy in docker/security-headers.conf names the same host.
  analytics: {
    script: 'https://umami.geofare.dk/script.js',
    websiteId: '5e442288-c1bd-462a-94c5-c6adb27038f5',
    endpoint: 'https://umami.geofare.dk/api/send',
  },
  company: {
    street: '[street address]',
    postalTown: '[postcode and town]',
    cvr: '46811461',
    email: 'hej@geofare.dk',
    linkedin: 'https://www.linkedin.com/company/geofare',
  },
};
