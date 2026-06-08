import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
	site: 'https://www.anttituomola.fi',
	output: 'server',
	adapter: vercel(),
	integrations: [
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