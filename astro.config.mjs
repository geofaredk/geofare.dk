// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './src/config/site.ts';

const excludedFromSitemap = ['/privacy', '/404'];

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
      filter: (page) => !excludedFromSitemap.some((path) => new URL(page).pathname.replace(/\/$/, '') === path),
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
