import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('should login successfully with default credentials', async ({ page }) => {
    await page.goto('/#/setting')

    await page.waitForSelector('.user-section', { timeout: 10000 })

    const alreadyLoggedIn = await page.locator('.username').filter({ hasText: '开发者' }).isVisible().catch(() => false)
    if (alreadyLoggedIn) {
      return
    }

    const userButton = page.locator('.user-info')
    await userButton.click()

    const loginMenuItem = page.locator('.el-dropdown-menu__item:has-text("登录")')
    await loginMenuItem.click()

    const dialog = page.locator('.el-dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const usernameInput = dialog.locator('input').first()
    const passwordInput = dialog.locator('input[type="password"]').first()

    await expect(usernameInput).toHaveValue('developer')
    await expect(passwordInput).toHaveValue('LnkChatBIDemo@123')

    const loginButton = dialog.locator('button:has-text("登录")')
    await loginButton.click()

    await expect(page.locator('.username')).toHaveText('开发者', { timeout: 10000 })
  })

  test('should show health endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3100/health')
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.status).toBe('OK')
  })
})
