import { expect, test } from '@playwright/test'
import { dismissCoachmark, seedDemo, settle, startTrial, tab, tap } from './helpers'

test.describe('Onboarding and paywall', () => {
  test('three intro pages, three setup steps, paywall, then the Ondas tab with the chosen Onda running', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Start with a Lago' })).toBeVisible()
    // No Skip anywhere, and no Back on page one
    await expect(page.getByRole('button', { name: /skip/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0)

    await tap(page, 'Continue')
    await expect(page.getByRole('heading', { name: 'Step into an Onda' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
    await tap(page, 'Continue')
    await expect(page.getByRole('heading', { name: 'Keep what works' })).toBeVisible()
    await tap(page, 'Continue')

    await expect(page.getByRole('heading', { name: 'How long should an Onda last?' })).toBeVisible()
    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '14')
    await tap(page, 'Next')
    await expect(page.getByRole('heading', { name: 'When should we remind you?' })).toBeVisible()
    await tap(page, 'Next')
    await expect(page.getByRole('heading', { name: 'Which Onda calls you first?' })).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(10)
    await tap(page, /Zen Buddhism/, 'radio')
    await expect(page.getByRole('button', { name: /skip/i })).toHaveCount(0)
    await tap(page, 'Get Started')

    await expect(page.getByRole('heading', { name: 'Ondas+' })).toBeVisible()
    await expect(page.getByText('7 days free, then lifetime access for just € 14,99')).toBeVisible()
    await tap(page, 'Start Free Trial')

    // Lands on the Ondas tab, not inside the Onda
    await expect(page.getByRole('heading', { name: 'Ondas', exact: true })).toBeVisible()
    await expect(page.getByText('Onda · Day 1 of 14')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByRole('button', { name: /Zen Buddhism/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Ondas' })).toHaveAttribute('aria-selected', 'true')
  })

  test('closing the paywall without a trial leaves a non-free Onda unstarted', async ({ page }) => {
    await page.goto('/')
    for (const b of ['Continue', 'Continue', 'Continue', 'Next', 'Next']) await tap(page, b)
    await tap(page, /Sufism/, 'radio')
    await tap(page, 'Get Started')
    await tap(page, 'Close')
    await expect(page.getByText('No Onda running')).toBeVisible()
  })
})

test.describe('Lagos', () => {
  test.beforeEach(async ({ page }) => {
    await seedDemo(page)
    await tab(page, 'Lagos')
  })

  test('today card, check in from the row, and the two collapsible lists', async ({ page }) => {
    await expect(page.getByText('2 of 5 checked in')).toBeVisible()
    await expect(page.getByRole('button', { name: /^To Check In/ })).toContainText('3')
    await expect(page.getByRole('button', { name: /^Checked In/ })).toContainText('2')

    await tap(page, 'Check in Walk 10,000 steps', 'checkbox')
    await expect(page.getByText('3 of 5 checked in')).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Undo check in for Walk 10,000 steps' })).toBeChecked()

    await tap(page, /^To Check In/)
    await expect(page.getByRole('button', { name: /No phone before bed, day/ })).toHaveCount(0)
    await tap(page, /^To Check In/)
    await expect(page.getByRole('button', { name: /No phone before bed, day/ })).toBeVisible()
  })

  test('the actions menu opens from the dots and from a long press, with all eight actions', async ({ page }) => {
    await page.getByRole('button', { name: 'More actions' }).first().click()
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    for (const a of ['Check In', 'Edit', 'End', 'Restart', 'Extend', 'Share', 'Duplicate', 'Delete']) await expect(menu.getByRole('menuitem', { name: a, exact: true })).toBeVisible()
    await menu.getByRole('menuitem', { name: 'Extend' }).click()
    await expect(page.getByText('Extended by 7 days')).toBeVisible()
    await expect(menu).toHaveCount(0)

    // Long press
    const row = page.getByRole('button', { name: /No phone before bed, day/ })
    const box = (await row.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.waitForTimeout(700)
    await page.mouse.up()
    await expect(page.getByRole('menu')).toBeVisible()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(page.getByText('Lago deleted')).toBeVisible()
    await expect(page.getByRole('button', { name: /No phone before bed, day/ })).toHaveCount(0)
    await tap(page, 'Undo')
    await expect(page.getByRole('button', { name: /No phone before bed, day/ })).toBeVisible()
  })

  test('insights, then the check in sheet saves a note', async ({ page }) => {
    await tap(page, /Delete social media, day 2 of 30/)
    await expect(page.getByRole('heading', { name: 'Lago', exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: '2/30 days' })).toBeVisible()
    await expect(page.getByText('Streak')).toBeVisible()
    await expect(page.getByText('Score')).toBeVisible()

    await tap(page, 'Check In')
    const sheet = page.getByRole('dialog', { name: 'Check In' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'Missed' }).click()
    await sheet.getByRole('button', { name: 'Completed' }).click()
    await sheet.getByRole('textbox', { name: 'What did you notice?' }).fill('Easier than expected.')
    await tap(page, 'Save')
    await expect(sheet).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Edit Check In' })).toBeVisible()
    await tap(page, 'Back')
    await expect(page.getByText('3 of 5 checked in')).toBeVisible()
  })

  test('free tier stops at the Lago limit; with the trial a gallery Lago starts', async ({ page }) => {
    await tap(page, 'New Lago')
    await expect(page.getByRole('heading', { name: 'Ondas+' })).toBeVisible() // five running Lagos is over the free limit
    await tap(page, 'Start Free Trial')

    await tap(page, 'Gallery')
    await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Featured' })).toBeVisible()
    await tap(page, /Health/)
    await expect(page.getByText('8 Lagos to experiment with')).toBeVisible()
    await tap(page, /Quit sugar/)
    const info = page.getByRole('dialog')
    await expect(info.getByText('30 Days', { exact: true })).toBeVisible()
    await expect(info.getByText(/Lago ends on .* if you start today\./)).toBeVisible()
    await expect(info.getByText('This is not professional advice.')).toBeVisible()
    await tap(page, 'Start Lago')
    await expect(page.getByRole('button', { name: /Quit sugar, day 1 of 30/ })).toBeVisible()
    await expect(page.getByText('2 of 6 checked in')).toBeVisible()
  })

  test('new Lago form creates a Lago; Top Lagos filters by category', async ({ page }) => {
    await startTrial(page)
    await tap(page, 'New Lago')
    const form = page.getByRole('dialog', { name: 'New Lago' })
    await form.getByRole('textbox', { name: 'Name' }).fill('Read 20 pages')
    await form.getByRole('radio', { name: 'Icon 6' }).click()
    await form.getByRole('button', { name: 'Decrease' }).click()
    await expect(form.getByText('Length: 29 days')).toBeVisible()
    await tap(page, 'Save')
    await expect(page.getByRole('button', { name: /Read 20 pages, day 1 of 29/ })).toBeVisible()

    await tap(page, 'Gallery')
    await tap(page, /Top Lagos/)
    await expect(page.getByRole('listitem')).toHaveCount(12)
    await tap(page, 'All Categories')
    await page.getByRole('menuitem', { name: 'Challenge' }).click()
    await expect(page.getByRole('listitem')).toHaveCount(2)
  })
})

test.describe('Ondas', () => {
  test.beforeEach(async ({ page }) => {
    await seedDemo(page)
  })

  test('Ondas tab: banner, four tiles, and Today with one list at a time', async ({ page }) => {
    await expect(page.getByText('2 of 4 practices')).toBeVisible()
    for (const tile of ['Immerse', 'Journal', 'Philosophy', 'Full guide']) await expect(page.getByRole('button', { name: tile, exact: true })).toBeVisible()
    await tap(page, 'Voluntary discomfort Midday · Fast or go without', 'checkbox')
    await expect(page.getByText('3 of 4 practices')).toBeVisible()
    await tap(page, 'Rules', 'tab')
    await expect(page.getByRole('checkbox', { name: /Do not complain aloud/ })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /Morning premeditation/ })).toHaveCount(0)
    await tap(page, 'Tasks', 'tab')
    await expect(page.getByRole('checkbox', { name: /Read one Letter from Seneca/ })).toBeVisible()
  })

  test('Today page, Full guide with seven tabs, and immersion filters', async ({ page }) => {
    await page.getByRole('button', { name: /Onda · Day 4 of 14/ }).click()
    await settle(page, 900)
    await expect(page.getByRole('heading', { name: 'Day 4 of 14' })).toBeVisible()
    await expect(page.getByText('Today: Premeditation of evils')).toBeVisible()
    await expect(page.getByText('Quote of the day')).toBeVisible()
    await expect(page.getByText('Word of the day')).toBeVisible()
    for (const s of ['Practices', 'Rules', 'Tasks', 'Immerse', 'Think about']) await expect(page.getByRole('heading', { name: s, exact: true })).toBeVisible()

    await page.getByRole('button', { name: /Full guide Context, history/ }).click()
    const guide = page.getByRole('dialog', { name: 'Stoicism' })
    await expect(guide).toBeVisible()
    for (const t of ['Overview', 'History', 'Ideas', 'Ways', 'Culture', 'Language', 'Facts']) await expect(guide.getByRole('button', { name: t, exact: true })).toBeVisible()
    await guide.getByRole('button', { name: 'History', exact: true }).click()
    await guide.getByRole('button', { name: /c\. 300 BCE/ }).click()
    await expect(guide.getByText(/The school took its name from the porch/)).toBeVisible()
    await guide.getByRole('button', { name: 'Language', exact: true }).click()
    await expect(guide.getByText('Prohairesis')).toBeVisible()
    await tap(page, 'Close')

    await tap(page, 'See All')
    await expect(page.getByText('Immersion', { exact: true })).toBeVisible()
    for (const c of ['All', 'Books', 'Watch', 'Listen', 'Art', 'Food', 'Drinks', 'Customs', 'Language']) await expect(page.getByRole('button', { name: c, exact: true })).toBeVisible()
    await tap(page, 'Food')
    await expect(page.getByText('Lentil soup', { exact: true })).toBeVisible()
    await expect(page.getByText('Meditations', { exact: true })).toHaveCount(0)
    await tap(page, 'Mark Lentil soup done', 'checkbox')
    await expect(page.getByRole('checkbox', { name: 'Mark Lentil soup done' })).toBeChecked()
    // Back returns to the screen you came from
    await tap(page, 'Back')
    await expect(page.getByRole('heading', { name: 'Day 4 of 14' })).toBeVisible()
  })

  test('journal lists past entries, and saving a new one returns to the list', async ({ page }) => {
    await tap(page, 'Journal')
    const list = page.getByRole('dialog', { name: 'Journal' })
    await expect(list.getByText('Day 3 · Stoicism')).toBeVisible()
    await expect(list.getByText('Day 1 · Stoicism')).toBeVisible()
    await list.getByRole('button', { name: 'New Entry', exact: true }).click()
    await settle(page, 900)
    const editor = page.getByRole('dialog', { name: 'Journal' }).last()
    await expect(editor.getByText('Day 4 · Stoicism')).toBeVisible()
    await expect(editor.getByText('Practiced today')).toBeVisible()
    await editor.getByRole('textbox').fill('The meeting I dreaded went fine.')
    await editor.getByRole('button', { name: 'Save' }).click()
    await settle(page, 900)
    await expect(page.getByRole('dialog', { name: 'Journal' }).last().getByText('The meeting I dreaded went fine.')).toBeVisible()
  })

  test('browsing another Onda previews it; beginning it ends the current one', async ({ page }) => {
    await startTrial(page)
    await tap(page, 'Browse Ondas')
    await expect(page.getByText('Ten traditions, one at a time')).toBeVisible()
    await expect(page.getByRole('button', { name: /Stoicism/ })).toContainText('Active')
    await tap(page, /Taoism/)
    await expect(page.getByRole('heading', { name: '14 days' })).toBeVisible()
    await expect(page.getByText('Beginning ends Stoicism. One Onda at a time.')).toBeVisible()
    // Run-only links are hidden in preview
    await expect(page.getByRole('button', { name: 'See All' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Final reflection/ })).toHaveCount(0)
    await tap(page, 'Increase')
    await expect(page.getByText('Length: 15 days')).toBeVisible()
    await tap(page, 'Begin Onda')
    await expect(page.getByRole('heading', { name: 'Day 1 of 15' })).toBeVisible()
    await tap(page, 'Back')
    await tap(page, 'Back')
    await expect(page.getByText('Onda · Day 1 of 15')).toBeVisible()
  })

  test('final reflection, carry forward, and the kept practice becomes a Lago', async ({ page }) => {
    await page.getByRole('button', { name: /Onda · Day 4 of 14/ }).click()
    await settle(page, 900)
    await page.getByRole('button', { name: /Final reflection/ }).click()
    await settle(page, 900)
    await expect(page.getByRole('heading', { name: '4 days of Stoicism' })).toBeVisible()
    await tap(page, 'Begin')
    await expect(page.getByText('1 of 6')).toBeVisible()
    await page.getByRole('textbox').fill('My reactions, sometimes.')
    for (let i = 0; i < 6; i++) await tap(page, 'Next')
    await expect(page.getByRole('heading', { name: 'What will you keep living?' })).toBeVisible()
    await tap(page, 'Keep Evening review', 'switch')
    await tap(page, 'Complete · Add 1 Lago')
    await expect(page.getByRole('heading', { name: 'Onda complete' })).toBeVisible()
    await expect(page.getByText('1 practice from Stoicism now continues as a Lago.')).toBeVisible()
    await tap(page, 'View Lagos')
    await expect(page.getByRole('button', { name: /Evening review, day 1 of 30/ })).toBeVisible()
    await tab(page, 'Ondas')
    await expect(page.getByText('No Onda running')).toBeVisible()
  })

  test('create your own Onda from the plus button', async ({ page }) => {
    await startTrial(page)
    await tap(page, 'New Onda')
    const sheet = page.getByRole('dialog', { name: 'New Onda' })
    await sheet.getByRole('textbox', { name: 'Name', exact: true }).fill('Epicurean Garden')
    await sheet.getByRole('textbox', { name: 'Tradition, culture or thinker' }).fill('Epicurus')
    await sheet.getByRole('radio', { name: 'Purple' }).click()
    await sheet.getByRole('textbox', { name: 'Add a practice' }).fill('Dinner with friends')
    await sheet.getByRole('button', { name: 'Add' }).first().click()
    await tap(page, 'Save')
    await expect(page.getByRole('heading', { name: 'Epicurean Garden' })).toBeVisible()
    await expect(page.getByRole('checkbox', { name: /Dinner with friends/ })).toBeVisible()
  })
})

test.describe('Stats and Settings', () => {
  test.beforeEach(async ({ page }) => {
    await seedDemo(page)
  })

  test('range switch, twelve achievements, and the history day log', async ({ page }) => {
    await tab(page, 'Stats')
    await expect(page.getByText('Check ins per day across your Lagos and Ondas, last 7 days.')).toBeVisible()
    await tap(page, 'All', 'tab')
    await expect(page.getByText('Best Streak')).toBeVisible()
    await expect(page.getByText('Check ins per month since you started.')).toBeVisible()

    await page.getByRole('button', { name: /Achievements/ }).click()
    const ach = page.getByRole('dialog', { name: 'Achievements' })
    await expect(ach.getByRole('radio')).toHaveCount(12)
    await ach.getByRole('radio', { name: /Devoted/ }).click()
    await expect(ach.getByText(/Reach 100 check ins · /)).toBeVisible()
    await tap(page, 'Close')

    const today = new Date()
    await page.getByRole('button', { name: `${today.getDate()} ${today.toLocaleString('en-US', { month: 'long' })}`, exact: true }).click()
    const log = page.getByRole('dialog')
    await expect(log.getByText('Checked in: Morning yoga')).toBeVisible()
    await tap(page, 'Close')
    // Eleven months back and no further
    for (let i = 0; i < 11; i++) await page.getByRole('button', { name: 'Previous month' }).last().click()
    await expect(page.getByRole('button', { name: 'Previous month' }).last()).toBeDisabled()
  })

  test('settings hub opens second screens; Dark switches the theme; integrations show honest state', async ({ page }) => {
    await tap(page, 'Settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    for (const row of ['Subscription', 'Appearance', 'Notifications', 'Practice', 'Integrations', 'Data', 'Privacy', 'Help & About']) await expect(page.getByRole('button', { name: new RegExp(`^${row}`) })).toBeVisible()

    await tap(page, /^Appearance/)
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await tap(page, 'Dark', 'tab')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByText('Default Onda length')).toBeVisible()
    await tap(page, 'Back')

    await tap(page, /^Integrations/)
    await expect(page.getByRole('button', { name: /Apple Reminders.*Via Shortcuts/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Calendar.*Off/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Notion.*Off/ })).toBeVisible()
    // Integrations are part of Ondas+: the free tier is sent to the paywall
    await tap(page, /Notion.*Off/)
    await expect(page.getByRole('heading', { name: 'Ondas+' })).toBeVisible()
  })
})

test.describe('Native-feeling navigation', () => {
  test('edge-swipe goes back, and a sheet dismisses on a downward swipe', async ({ page }) => {
    await seedDemo(page)
    await tab(page, 'Lagos')
    await tap(page, 'Gallery')
    await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible()

    // Drag from the left edge past the midpoint
    const { width, height } = page.viewportSize()!
    await page.mouse.move(6, height / 2)
    await page.mouse.down()
    await page.mouse.move(width * 0.7, height / 2, { steps: 10 })
    await page.mouse.up()
    await expect(page.getByRole('heading', { name: 'Gallery' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Lagos', exact: true })).toBeVisible()

    // A short drag from the edge springs back and stays
    await tap(page, 'Gallery')
    await page.mouse.move(6, height / 2)
    await page.mouse.down()
    // a slow drag: velocity is measured from timestamps, so pace the moves like a finger
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(6 + ((width * 0.2 - 6) * i) / 8, height / 2)
      await page.waitForTimeout(60)
    }
    await page.waitForTimeout(250)
    await page.mouse.up()
    await settle(page, 900)
    await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible()

    // Sheet: drag the header down
    await tap(page, /Top Lagos/)
    await tap(page, /Walk 10,000 steps/)
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    const box = (await sheet.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + 14)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, box.y + 420, { steps: 8 })
    await page.mouse.up()
    await expect(sheet).toHaveCount(0)
  })

  test('safe-area shell: fixed viewport, no page scroll, 44pt targets on icon buttons', async ({ page }) => {
    await page.goto('/')
    await dismissCoachmark(page)
    const shell = await page.evaluate(() => ({
      viewport: document.querySelector('meta[name=viewport]')!.getAttribute('content'),
      capable: document.querySelector('meta[name=apple-mobile-web-app-capable]')!.getAttribute('content'),
      overflow: getComputedStyle(document.documentElement).overflow,
      overscroll: getComputedStyle(document.documentElement).getPropertyValue('overscroll-behavior') || getComputedStyle(document.body).getPropertyValue('overscroll-behavior') || 'none',
      scrollable: document.documentElement.scrollHeight > window.innerHeight + 1,
      manifest: !!document.querySelector('link[rel=manifest]'),
      touchIcon: document.querySelector('link[rel=apple-touch-icon]')!.getAttribute('sizes'),
      splash: document.querySelectorAll('link[rel=apple-touch-startup-image]').length,
    }))
    expect(shell.viewport).toContain('viewport-fit=cover')
    expect(shell.viewport).toContain('user-scalable=no')
    expect(shell.capable).toBe('yes')
    expect(shell.overflow).toBe('hidden')
    expect(shell.overscroll).toBe('none')
    expect(shell.scrollable).toBe(false)
    expect(shell.manifest).toBe(true)
    expect(shell.touchIcon).toBe('180x180')
    expect(shell.splash).toBeGreaterThanOrEqual(20)

    await seedDemo(page)
    for (const name of ['New Onda', 'Browse Ondas', 'Settings']) {
      const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })
})
