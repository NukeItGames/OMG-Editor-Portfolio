import { defineConfig } from '@playwright/test';

export default defineConfig( {
	testDir: './tests',
	workers: 1,
	timeout: 60000,
	expect: { timeout: 15000 },
	use: {
		baseURL: 'http://127.0.0.1:4173',
		viewport: { width: 1440, height: 900 },
		colorScheme: 'dark',
		launchOptions: {
			executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
			args: [ '--use-angle=swiftshader', '--enable-unsafe-swiftshader' ]
		},
		trace: 'retain-on-failure'
	},
	webServer: {
		command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: false
	}
} );
