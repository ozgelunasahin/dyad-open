import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import { statSync } from 'fs';
import { join } from 'path';
import type { Plugin } from 'vite';

// Marker file to track API writes - prevents reload loop during in-app editing
const API_WRITE_MARKER = '.last-api-write';
const SUPPRESS_WINDOW_MS = 2000; // Ignore changes within 2s of API write

function wasRecentlyWrittenByApi(): boolean {
	try {
		const stat = statSync(API_WRITE_MARKER);
		const elapsed = Date.now() - stat.mtimeMs;
		return elapsed < SUPPRESS_WINDOW_MS;
	} catch {
		return false;
	}
}

function vaultHotReload(): Plugin {
	return {
		name: 'vault-hot-reload',
		configureServer(server) {
			const contentDir = 'content/notes';

			server.watcher.add(contentDir);

			server.watcher.on('change', (path) => {
				if (path.includes('content/notes') && path.endsWith('.md')) {
					// Skip if this change was triggered by our own API write
					if (wasRecentlyWrittenByApi()) {
						console.log(`\n[vault] ${path} changed (API write, skipping reload)`);
						return;
					}
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
