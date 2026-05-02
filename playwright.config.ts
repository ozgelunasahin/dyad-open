import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load env vars for test helpers (Supabase keys, etc.)
config({ path: '.env.local' });

const isCI = !!process.env.CI;
const baseURL = isCI ? 'http://localhost:4173' : 'http://localhost:5173';

// Env injected into the spawned dev/preview server for the duration of
// the e2e run. The Plausible domain enables the script tag in tests
// that assert on it; the dev bypass lets tests visit /admin/* without
// Cloudflare Access (which doesn't run locally).
const webServerEnv = {
	PUBLIC_PLAUSIBLE_DOMAIN: 'dyad-test.invalid',
	ADMIN_DEV_BYPASS: '1'
};

export default defineConfig({
	testDir: './tests',
	fullyParallel: false,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: 1,
	reporter: 'html',
	use: {
		baseURL,
		// SECURITY: Traces capture Authorization headers containing Bearer tokens.
		// Never enable traces in CI where artifacts are retained.
		trace: isCI ? 'off' : 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'setup',
			testMatch: /auth\.setup\.ts/
		},
		{
			name: 'desktop',
			testMatch: /e2e\/.*\.test\.ts/,
			use: { viewport: { width: 1280, height: 720 } },
			dependencies: ['setup']
		},
		{
			name: 'mobile',
			testMatch: /e2e\/.*\.responsive\.test\.ts/,
			use: { ...devices['Pixel 7'] },
			dependencies: ['setup']
		}
	],
	webServer: isCI
		? { command: 'npm run build && npm run preview', url: baseURL, reuseExistingServer: false, stdout: 'pipe', stderr: 'pipe', env: webServerEnv }
		: { command: 'npm run dev', url: baseURL, reuseExistingServer: !process.env.PW_FRESH_SERVER, stdout: 'pipe', stderr: 'pipe', env: webServerEnv }
});
