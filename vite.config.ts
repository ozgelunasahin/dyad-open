import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	},
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'dyad',
				short_name: 'dyad',
				description: 'Explore connected notes in space',
				theme_color: '#ffffff',
				background_color: '#f8fafc',
				display: 'standalone',
				start_url: '/',
				icons: [
					{
						src: 'icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: 'icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,html,svg,png,woff2,json}']
			},
			devOptions: {
				enabled: false
			}
		})
	]
});
