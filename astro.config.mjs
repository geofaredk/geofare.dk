// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './src/config/site.ts';

const excludedFromSitemap = ['/imprint', '/404'];
// Draft languages (placeholder copy) stay out of the sitemap altogether.
const draftPaths = Object.values(site.locales).filter((locale) => locale.draft).map((locale) => locale.path);

export default defineConfig({
  output: 'static',
  site: site.url,
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: site.defaultLang,
    locales: Object.keys(site.locales),
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const { pathname } = new URL(page);
        if (draftPaths.some((path) => (pathname + '/').startsWith(path))) return false;
        return !excludedFromSitemap.some((path) => pathname.replace(/\/$/, '') === path);
      },
    }),
  ],
  build: {
    // CSP: style-src 'self' — never inline stylesheets.
    inlineStylesheets: 'never',
  },
  vite: {
    build: {
      // CSP: script-src 'self' — Astro inlines processed <script>s and assets below this
      // limit (core/build/plugins/plugin-scripts.js), so 0 keeps everything external.
      assetsInlineLimit: 0,
    },
  },
});
