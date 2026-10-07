import { expect, type Page } from '@playwright/test'

/** Let springs and page transitions settle. */
export const settle = (page: Page, ms = 500) => page.waitForTimeout(ms)

/** Load the demo data set: Stoicism on day 4 of 14 and five Lagos, two of them checked in. */
export async function seedDemo(page: Page) {
  await page.goto('/?seed=demo')
  // IndexedDB writes are slow in Playwright's WebKit build, so give the seed time.
  await expect(page.getByText('Onda · Day 4 of 14')).toBeVisible({ timeout: 90_000 })
  await dismissCoachmark(page)
}

/** The Add to Home Screen coachmark shows once in Safari. Tests close it the way a person would. */
export async function dismissCoachmark(page: Page) {
  const x = page.getByRole('button', { name: 'Dismiss' })
  if (await x.isVisible().catch(() => false)) await x.click()
}

export const tab = async (page: Page, name: 'Lagos' | 'Ondas' | 'Stats') => {
  await page.getByRole('tab', { name }).click()
  await settle(page)
}

export const tap = async (page: Page, name: string | RegExp, role: 'button' | 'checkbox' | 'tab' | 'menuitem' | 'radio' | 'switch' = 'button') => {
  await page.getByRole(role, { name, exact: typeof name === 'string' }).first().click()
  await settle(page)
}

/** Start the seven day trial through Settings, as a user would. Unlocks every Onda and unlimited Lagos. */
export async function startTrial(page: Page) {
  await tap(page, 'Settings')
  await page.getByRole('button', { name: /Ondas\+.*Start Free Trial/s }).click()
  await settle(page)
  await tap(page, 'Start Free Trial')
  await expect(page.getByRole('button', { name: /Ondas\+.*Trial · 7 days/s })).toBeVisible()
  await tap(page, 'Back')
}
