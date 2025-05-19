// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'xinkjs',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/xinkjs/xink' }],
			sidebar: [
				{
					label: 'Start',
					items: [
						{ label: 'Overview', slug: 'start/overview' },
						{ label: 'Quickstart', slug: 'start/quickstart' },
						{ label: 'About', slug: 'start/about' },
					],
				},
				{
					label: 'Docs',
					items: [
						{ label: 'Routing', slug: 'docs/routing' },
						{ label: 'Middleware', slug: 'docs/middleware' },
						{ label: 'Event', slug: 'docs/event' },
						{ label: 'Validation', slug: 'docs/validation' },
						{ label: 'Hooks', slug: 'docs/hooks' },
						{ label: 'Errors', slug: 'docs/errors' },
						{ label: 'OpenAPI', slug: 'docs/openapi' },
						{ label: 'JSX', slug: 'docs/jsx' },
						{ label: 'Return Types', slug: 'docs/return-types' },
						{ label: 'Helpers', slug: 'docs/helpers' },
						{ label: 'Configuration', slug: 'docs/configuration' },
						{ label: 'Production', slug: 'docs/production' },
						{ label: 'Others', slug: 'docs/others' },
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			],
			customCss: ['./src/styles/global.css'],
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
