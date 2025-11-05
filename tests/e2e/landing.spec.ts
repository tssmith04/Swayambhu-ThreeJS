import { test, expect } from '@playwright/test'

test.describe('Landing page', () => {
    test('loads and shows key UI', async ({ page }) => {
        await page.goto('/index.html')
        await expect(page).toHaveTitle(/Swayambhu Stories/i)
        await expect(page.getByRole('link', { name: /Swayambhu Stories/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /About/i })).toBeVisible()

        const explore = page.getByRole('link', { name: /Explore in 3D/i })
        await expect(explore).toBeVisible()
        await expect(explore).toHaveAttribute('href', '/model')
    })

    test('about page is reachable', async ({ page }) => {
        await page.goto('/about.html')
        await expect(page).toHaveTitle(/About/i)
        await expect(page.getByRole('link', { name: /Swayambhu Stories/i })).toBeVisible()
    })
})
