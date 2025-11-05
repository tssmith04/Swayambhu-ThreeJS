import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: 'tests/e2e',
    timeout: 90_000,
    expect: { timeout: 10_000 },
    retries: 0,
    reporter: [['list'], ['html']],
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retry-with-video',
    },
    webServer: {
        command: 'npm run preview -- --port 4173',
        url: 'http://localhost:4173',
        reuseExistingServer: true,
        stdout: 'pipe',
        stderr: 'pipe',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
})
