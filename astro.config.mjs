import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  integrations: [
    tailwind({
      // Force Tailwind to generate all styles
      applyBaseStyles: false
    }),
    mdx({
      syntaxHighlight: 'prism',
      drafts: true,
    }),
    react()
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true
    }
  }
});