import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	},
	server: {
		// Dev-only: admit the conference hostnames so the host routing in
		// hooks.server.ts can be exercised locally with a Host header or a
		// hosts-file entry (production host admission lives in route-kind.ts).
		allowedHosts: ['dyad.amsterdam', 'www.dyad.amsterdam']
	},
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'dyad',
				short_name: 'dyad',
				description: 'Cultivating a culture of conversation in Berlin',
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
				globPatterns: ['client/**/*.{js,css,html,svg,woff2,json}'],
				globIgnores: ['client/uploads/**']
			},
			devOptions: {
				enabled: false
			}
		})
	]
});
