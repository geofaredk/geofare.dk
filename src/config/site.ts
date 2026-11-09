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
  /** The words in this language's URLs: `/da/kolofon/`, `/da/ydelser/<slug>/`. The default language's are the file names under `src/pages/`. */
  routes: Record<Route, string>;
  /** The ids of the sections, as they appear after `#` in a link: `/#services` is `/da/#ydelser` in Danish. */
  anchors: Record<Anchor, string>;
}

/** The pages whose URL has a word of its own in each language. */
export type Route = 'imprint' | 'services';

/** The sections a link can lead to: the home page's, then the service landing pages' own. The hero of both is `top`. */
export type Anchor = 'top' | 'services' | 'about' | 'clients' | 'approach' | 'sectors' | 'lab' | 'contact' | 'situations' | 'offer' | 'process' | 'audiences' | 'why' | 'faq';

export const site = {
  name: 'geofare',
  // Open point in the brief: the real domain is not known yet. Override with SITE_URL at build time.
  url: process.env.SITE_URL ?? 'https://www.geofare.dk',
  defaultLang: 'en' as Lang,
  // Danish was a draft while its copy was placeholder text; published on 9 November 2026. A new language starts as `draft: true`.
  locales: {
    en: {
      path: '/',
      htmlLang: 'en-GB',
      hreflang: 'en',
      name: 'English',
      short: 'EN',
      draft: false,
      routes: { imprint: 'imprint', services: 'services' },
      anchors: {
        top: 'top',
        services: 'services',
        about: 'about',
        clients: 'clients',
        approach: 'approach',
        sectors: 'sectors',
        lab: 'lab',
        contact: 'contact',
        situations: 'situations',
        offer: 'offer',
        process: 'process',
        audiences: 'audiences',
        why: 'why',
        faq: 'faq',
      },
    },
    da: {
      path: '/da/',
      htmlLang: 'da-DK',
      hreflang: 'da',
      name: 'Dansk',
      short: 'DA',
      draft: false,
      routes: { imprint: 'kolofon', services: 'ydelser' },
      // Lower-case ASCII words, å written aa, as in the landing page slugs. `top`, `lab` and `faq` are the same words in Danish.
      anchors: {
        top: 'top',
        services: 'ydelser',
        about: 'om-os',
        clients: 'kunder',
        approach: 'tilgang',
        sectors: 'sektorer',
        lab: 'lab',
        contact: 'kontakt',
        situations: 'situationer',
        offer: 'leverancer',
        process: 'proces',
        audiences: 'maalgrupper',
        why: 'hvorfor',
        faq: 'faq',
      },
    },
  } as Record<Lang, Locale>,
  // Umami analytics, self-hosted at umami.geofare.dk: the script every page loads, the site it
  // counts for, and where the script reports to (always /api/send next to the script).
  // The Content Security Policy in docker/security-headers.conf names the same host.
  analytics: {
    script: 'https://umami.geofare.dk/script.js',
    websiteId: '5e442288-c1bd-462a-94c5-c6adb27038f5',
    endpoint: 'https://umami.geofare.dk/api/send',
  },
  // The newsletter's own site, where the button of the newsletter section leads.
  newsletter: {
    url: 'https://debrief.geofare.dk/',
  },
  company: {
    street: '[street address]',
    postalTown: '[postcode and town]',
    cvr: '46811461',
    email: 'hej@geofare.dk',
    linkedin: 'https://www.linkedin.com/company/geofare',
    // Where "Book an introductory call" in the contact section leads.
    booking: 'https://calendar.proton.me/u/1/bookings#JuuB7gNED1nQsy-nF_ayDCq9iRUi270fRDNqAIedoJQ=',
  },
};
