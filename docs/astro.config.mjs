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
					label: 'About',
					items: [
						{ label: 'Overview', slug: 'about/overview' }
					]
				},
				{
					label: 'xink',
					items: [
						{ label: 'Overview', slug: 'xink/overview' },
						{ label: 'Quickstart', slug: 'xink/quickstart' },
						{ label: 'Routing', slug: 'xink/routing' },
						{ label: 'Validation', slug: 'xink/validation' },
						{ label: 'Middleware', slug: 'xink/middleware' },
						{ label: 'Hooks', slug: 'xink/hooks' },
						{ label: 'Event', slug: 'xink/event' },
						{ label: 'JSX', slug: 'xink/jsx' },
						{ label: 'Return Types', slug:'xink/return-types'},
						{ label: 'Helpers', slug: 'xink/helpers' },
						{ label: 'Errors', slug: 'xink/errors' },
						{ label: 'OpenAPI', slug: 'xink/openapi' },
						{ label: 'Typed Client', slug: 'xink/client' },
						{ label: 'Others', slug: 'xink/others' },
						{ label: 'Adapters', slug: 'xink/adapters' },
						{ label: 'Production', slug: 'xink/production' },
						{ label: 'API', slug: 'xink/api' }
					]
				},
				{
					label: 'xin',
					items: [
						{ label: 'Overview', slug: 'xin/overview' },
						{ label: 'Quickstart', slug: 'xin/quickstart' },
						{ label: 'Routes', slug: 'xin/routes' },
						{ label: 'Validation', slug: 'xin/validation' },
						{ label: 'Middleware', slug: 'xin/middleware' },
						{ label: 'Hooks', slug: 'xin/hooks' },
						{ label: 'Event', slug: 'xin/event' },
						{ label: 'JSX', slug: 'xin/jsx' },
						{ label: 'Return Types', slug:'xin/return-types'},
						{ label: 'Helpers', slug: 'xin/helpers' },
						{ label: 'Errors', slug: 'xin/errors' },
						{ label: 'OpenAPI', slug: 'xin/openapi' },
						{ label: 'Typed Client', slug: 'xin/client' },
						{ label: 'Others', slug: 'xin/others' },
						{ label: 'API', slug: 'xin/api' }
					]
				},
				{
					label: 'xi',
					items: [
						{ label: 'Overview', slug: 'xi/overview' },
						{ label: 'Quickstart', slug: 'xi/quickstart' },
						{ label: 'Routes', slug: 'xi/routes' },
						{ label: 'API', slug: 'xi/api' }
					]
				}
			],
			customCss: ['./src/styles/global.css'],
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
