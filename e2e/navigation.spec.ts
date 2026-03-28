import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('unauthenticated user clicking Get Started is redirected to login', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'Get Started' }).click()

    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('unauthenticated user accessing /dashboard is redirected to login', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('login page redirect param is preserved', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/auth\/login\?redirect=/)
  })
})
