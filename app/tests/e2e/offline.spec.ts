import { expect, test } from '@playwright/test'

// Runs on the Chromium engine at iPhone 15 Pro size (see playwright.config.ts for why).
test('after the first load, the app starts and works with no network', async ({ page, context }) => {
  await page.goto('/?seed=demo')
  await expect(page.getByText('Onda · Day 4 of 14')).toBeVisible({ timeout: 60_000 })

  // Wait for the service worker to take control and finish precaching every route and every Onda.
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise<void>((r) => navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true }))
    return reg.scope
  })
  await page.waitForTimeout(1500)

  await context.setOffline(true)
  await page.reload()
  // The app opens on the Ondas tab
  await expect(page.getByText('Onda · Day 4 of 14')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('tab', { name: 'Lagos' }).click()
  await expect(page.getByRole('heading', { name: 'Lagos', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Dismiss' }).click().catch(() => undefined)
  await expect(page.getByText('2 of 5 checked in')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Check in Walk 10,000 steps' }).click()
  await expect(page.getByText('3 of 5 checked in')).toBeVisible()

  // A lazily loaded route and lazily loaded content, with no network
  await page.getByRole('button', { name: 'Gallery' }).click()
  await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('tab', { name: 'Ondas' }).click()
  await page.getByRole('button', { name: 'Browse Ondas' }).click()
  await page.getByRole('button', { name: /Vedanta/ }).click()
  await expect(page.getByText('Tat tvam asi: that thou art.')).toBeVisible()
  await page.getByRole('button', { name: /Full guide Context, history/ }).click()
  await expect(page.getByText(/Vedānta is the philosophical heart/)).toBeVisible()

  await page.reload()
  await page.getByRole('tab', { name: 'Lagos' }).click()
  await expect(page.getByText('3 of 5 checked in')).toBeVisible({ timeout: 30_000 })
})
