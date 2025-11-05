import { test, expect } from '@playwright/test'

test.describe('Model page shell without assets', () => {
    test('intro -> enter -> app container visible and canvas present', async ({ page }) => {
        await page.goto('/model.html')
        const intro = page.locator('#introduction')
        const enter = page.locator('#enter-button')
        const appContainer = page.locator('#application-container')
        const app = page.locator('#app')

        await expect(intro).toBeVisible()
        await expect(enter).toBeVisible()
        await expect(appContainer).toBeHidden()

        await enter.click()
        await expect(intro).toBeHidden()
        await expect(appContainer).toBeVisible()
        await expect(app.locator('canvas')).toHaveCount(1)

        const returnBtn = page.locator('#return-to-intro')
        await returnBtn.click()
        await expect(intro).toBeVisible()
        await expect(appContainer).toBeHidden()
    })

    test('collect navigation timing for comparison', async ({ page }) => {
        await page.goto('/model.html')
        const nav = await page.evaluate(() => JSON.stringify(performance.getEntriesByType('navigation')[0], null, 2))
        test.info().annotations.push({ type: 'perf', description: nav })
        await expect(page.locator('#introduction')).toBeVisible()
    })
})
