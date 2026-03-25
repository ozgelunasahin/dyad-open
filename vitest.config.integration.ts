import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	resolve: {
		alias: {
			$lib: resolve('./src/lib')
		}
	},
	test: {
		include: ['tests/integration/**/*.test.ts'],
		testTimeout: 15000,
		hookTimeout: 30000,
		pool: 'forks',
		poolOptions: { forks: { singleFork: true } }
	}
});
