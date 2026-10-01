export type Lang = 'en'; // 'da' is added here later

export const site = {
  name: 'geofare',
  // Open point in the brief: the real domain is not known yet. Override with SITE_URL at build time.
  url: process.env.SITE_URL ?? 'https://geofare.example',
  defaultLang: 'en' as Lang,
  locales: { en: { path: '/', htmlLang: 'en-GB', hreflang: 'en' } } as Record<
    Lang,
    { path: string; htmlLang: string; hreflang: string }
  >,
  company: {
    street: '[street address]',
    postalTown: '[postcode and town]',
    cvr: '[number]',
    email: '[email address]',
    linkedin: '[LinkedIn URL]',
  },
};
