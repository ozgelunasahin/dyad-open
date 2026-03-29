import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load .env.local for local Supabase keys
config({ path: '.env.local' });

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
		// Sequential execution: tests share a database and depend on ordered state
		fileParallelism: false,
		pool: 'forks',
		poolOptions: { forks: { singleFork: true } }
	}
});
