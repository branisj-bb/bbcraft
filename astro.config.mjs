import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://bbcraft.cz',
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) =>
        !page.includes('/kosik') && !page.includes('/dekujeme'),
    }),
  ],
});
