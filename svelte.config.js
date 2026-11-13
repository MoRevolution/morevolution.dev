import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import remarkMath from 'remark-math';
import rehypeKatexSvelte from 'rehype-katex-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		mdsvex({
			extensions: ['.md'],
			// remark-math must stay on v3 and rehype-katex-svelte on v1: mdsvex bundles remark 8,
			// and the v6/v7 plugins target the micromark rewrite. The -svelte variant also escapes
			// the curly braces in KaTeX output that Svelte would otherwise parse as expressions.
			remarkPlugins: [remarkMath],
			rehypePlugins: [[rehypeKatexSvelte, { throwOnError: false, strict: false }]]
		})
	],
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		prerender: {
			entries: ['*'],
			handleUnseenRoutes: 'ignore'
		}
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
