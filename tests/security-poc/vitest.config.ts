import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Standalone vitest config for the security PoCs. The main unit-test config
 * (vite.config.ts) is scoped to `src/**`; we intentionally keep PoCs out of
 * that glob so they don't run during `npm test`.
 *
 * Run:
 *   npx vitest run --config tests/security-poc/vitest.config.ts
 *
 * The PoCs import production code that pulls in SvelteKit virtual modules
 * (`$app/environment`, `$env/dynamic/private`). We alias those to the
 * lightweight shims in this folder so the PoCs run without the full
 * SvelteKit Vite pipeline.
 */
export default defineConfig({
	resolve: {
		alias: {
			$lib: resolve(__dirname, '../../src/lib'),
			$app: resolve(__dirname, 'shims/app'),
			$env: resolve(__dirname, 'shims/env')
		}
	},
	test: {
		include: ['tests/security-poc/**/*.test.ts'],
		environment: 'node'
	}
});
