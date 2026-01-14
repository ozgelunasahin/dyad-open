import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import type { Plugin } from 'vite';

function vaultHotReload(): Plugin {
	return {
		name: 'vault-hot-reload',
		configureServer(server) {
			const contentDir = 'content/notes';

			server.watcher.add(contentDir);

			server.watcher.on('change', (path) => {
				if (path.includes('content/notes') && path.endsWith('.md')) {
					console.log(`\n[vault] ${path} changed, rebuilding...`);
					try {
						execSync('npx tsx scripts/build-vault.ts', { stdio: 'inherit' });
						server.ws.send({ type: 'full-reload' });
					} catch (e) {
						console.error('[vault] Build failed:', e);
					}
				}
			});

			server.watcher.on('add', (path) => {
				if (path.includes('content/notes') && path.endsWith('.md')) {
					console.log(`\n[vault] ${path} added, rebuilding...`);
					try {
						execSync('npx tsx scripts/build-vault.ts', { stdio: 'inherit' });
						server.ws.send({ type: 'full-reload' });
					} catch (e) {
						console.error('[vault] Build failed:', e);
					}
				}
			});

			server.watcher.on('unlink', (path) => {
				if (path.includes('content/notes') && path.endsWith('.md')) {
					console.log(`\n[vault] ${path} removed, rebuilding...`);
					try {
						execSync('npx tsx scripts/build-vault.ts', { stdio: 'inherit' });
						server.ws.send({ type: 'full-reload' });
					} catch (e) {
						console.error('[vault] Build failed:', e);
					}
				}
			});
		}
	};
}

export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	},
	plugins: [
		vaultHotReload(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Spatial Reader',
				short_name: 'SpatialRead',
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
				globPatterns: ['client/**/*.{js,css,html,svg,png,woff2,json}'],
				runtimeCaching: [
					{
						urlPattern: /^\/vault\/.*/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'vault-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24 * 30
							}
						}
					}
				]
			},
			devOptions: {
				enabled: false
			}
		})
	]
});
