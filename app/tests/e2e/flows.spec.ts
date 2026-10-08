import { expect, test } from '@playwright/test'
import { dismissCoachmark, seedDemo, settle, startTrial, tab, tap } from './helpers'

test.describe('Onboarding and paywall', () => {
  test('three intro pages, two setup steps, paywall, then the Ondas tab with the chosen Onda running', async ({ page }) => {
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
    await expect(page.getByRole('heading', { name: 'Which Onda calls you first?' })).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(60)
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
    for (const b of ['Continue', 'Continue', 'Continue', 'Next']) await tap(page, b)
    await tap(page, /Sufism/, 'radio')
    await tap(page, 'Get Started')
    await tap(page, 'Close')
    await expect(page.getByText('No Onda running')).toBeVisible()
  })
})

test.describe('Ondas+ beta placeholder', () => {
  test('Get Lifetime unlocks right away and nothing is charged', async ({ page }) => {
    await seedDemo(page)
    await tap(page, 'Settings')
    await page.getByRole('button', { name: /Ondas\+.*Start Free Trial/s }).click()
    await settle(page)
    await expect(page.getByText(/Beta: Ondas/)).toHaveCount(0) // the small beta note is gone
    await tap(page, /Get Lifetime/)
    await expect(page.getByText('Lifetime unlocked (beta)')).toBeVisible()
    await settle(page, 900)
    await expect(page.getByRole('button', { name: /Ondas\+.*Lifetime/s })).toBeVisible()
  })
})

test.describe('Update 1.3', () => {
  test('tab order is Ondas, Lagos, Stats; the barometer shows only the percentage and the tier', async ({ page }) => {
    await seedDemo(page)
    const names = await page.locator('nav[role=tablist] [role=tab]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
    expect(names).toEqual(['Ondas', 'Lagos', 'Stats'])
    await tab(page, 'Stats')
    await expect(page.getByRole('img', { name: /^Consistency \d+ percent/ })).toBeVisible()
    await expect(page.getByText(/Check ins per/)).toHaveCount(0)
    await expect(page.getByText(/Keep going/)).toHaveCount(0)
    // the range switch lives inside Activity
    await expect(page.getByRole('tab', { name: 'Month', exact: true })).toBeVisible()
  })

  test('the accent follows the running Onda in every tab, Lagos included', async ({ page }) => {
    await seedDemo(page)
    const accent = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())
    const onOndas = await accent()
    await tab(page, 'Lagos')
    const onLagos = await accent()
    expect(onLagos.toLowerCase()).toBe(onOndas.toLowerCase())
    expect(onOndas.toLowerCase()).not.toBe('#0a68d8')
    await tab(page, 'Stats')
    expect((await accent()).toLowerCase()).toBe(onOndas.toLowerCase())
  })

  test('import: a file that is not an Onda export is refused, and export is offered', async ({ page }) => {
    await seedDemo(page)
    await tap(page, 'Settings')
    await tap(page, /Data/)
    await expect(page.getByRole('button', { name: /Export Data/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Import Data/ })).toBeVisible()
    await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') })
    await expect(page.getByText('That is not an Onda export')).toBeVisible()
  })

  test('the Gallery offers practices from each Onda, started as Lagos', async ({ page }) => {
    await seedDemo(page)
    await startTrial(page)
    await tab(page, 'Lagos')
    await tap(page, 'Gallery')
    await expect(page.getByRole('heading', { name: 'From the Ondas' })).toBeVisible()
    // two Ondas are shown, the running one first; the rest sit behind See more, grouped as in Browse Ondas
    await tap(page, /^From the Ondas See more/)
    for (const g of ['Religions and spiritual traditions', 'Philosophy, thinkers and schools of thought', 'Empires, states and political systems', 'Cultures, eras and peoples']) await expect(page.getByRole('button', { name: new RegExp('^' + g) })).toBeVisible()
    await expect(page.getByText('Coming soon')).toHaveCount(0)
    await tap(page, /^Religions and spiritual traditions/)
    await expect(page.getByRole('button', { name: /Zen Buddhism/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Norse/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Confucianism/ })).toBeVisible()
    await tap(page, 'Back')
    await tap(page, /Stoicism/)
    const sheet = page.getByRole('dialog')
    await sheet.getByRole('checkbox', { name: /Cold shower/ }).click()
    await sheet.getByRole('button', { name: 'Start 1 Lago' }).click()
    await settle(page, 900)
    await expect(page.getByRole('button', { name: /Cold shower, day 1 of 14/ })).toBeVisible()
  })

  test('six more Ondas are listed', async ({ page }) => {
    await seedDemo(page)
    await tap(page, 'Browse Ondas')
    for (const n of ['Soviet Union', 'Yoruba', 'Aztec', 'Ancient Egypt', 'Hermeticism', 'Gnosticism']) await expect(page.getByRole('button', { name: new RegExp(n) }).first()).toBeVisible()
  })
})

test.describe('Update 1.4', () => {
  test('opens on the Ondas tab; Practices then Tasks; tasks have a bar and a shortcut', async ({ page }) => {
    await seedDemo(page)
    const seg = page.getByRole('tab', { name: /^(Practices|Tasks|Rules)$/ })
    expect(await seg.allTextContents()).toEqual(['Practices', 'Tasks'])
    await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
    await expect(page.getByText(/of 8 tasks/)).toBeVisible()
    await page.getByRole('button', { name: /Open Journal/ }).first().click()
    await expect(page.getByRole('heading', { name: 'Journal' })).toBeVisible() // a full page, not a sheet
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('a Lago made from an Onda practice shares its tick both ways', async ({ page }) => {
    await seedDemo(page)
    await startTrial(page)
    await tab(page, 'Lagos')
    await tap(page, 'New Lago')
    await page.getByRole('group', { name: /From your Stoicism practices/ }).getByRole('button', { name: /Dichotomy check/ }).click()
    await expect(page.getByText(/Linked: ticking it here also ticks it in Stoicism/)).toBeVisible()
    await tap(page, 'Save')
    await settle(page, 900)
    // check it in on the Lagos side, then find it ticked on the Ondas side
    await tap(page, 'Check in Dichotomy check', 'checkbox')
    await tab(page, 'Ondas')
    await expect(page.getByRole('checkbox', { name: /Dichotomy check/ })).toBeChecked()
    // and the other way: untick the practice, the Lago follows
    await page.getByRole('checkbox', { name: /Dichotomy check/ }).click()
    await tab(page, 'Lagos')
    await expect(page.getByRole('checkbox', { name: 'Check in Dichotomy check' })).not.toBeChecked()
  })
})

test.describe('Update 2.0', () => {
  test('Browse Ondas has four groups, and since 5.0 every Onda in them can be opened', async ({ page }) => {
    await seedDemo(page)
    await tap(page, 'Browse Ondas')
    for (const g of ['Religions and spiritual traditions', 'Philosophy, thinkers and schools of thought', 'Empires, states and political systems', 'Cultures, eras and peoples']) await expect(page.getByRole('button', { name: new RegExp('^' + g) })).toBeVisible()
    await expect(page.getByRole('button', { name: /Nietzsche/ })).toBeVisible()
    await expect(page.getByText('Coming soon')).toHaveCount(0)
    await expect(page.locator('[aria-disabled="true"]', { hasText: 'Nietzsche' })).toHaveCount(0)
  })

  test('the background takes a light wash of the Onda colour, and Settings can turn it off', async ({ page }) => {
    await seedDemo(page)
    const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface-grouped').trim())
    const washed = await bg()
    expect(washed).not.toBe('#f5f1e8')
    await tap(page, 'Settings')
    await tap(page, /^Appearance/)
    await page.getByRole('switch', { name: 'Onda background tint' }).click()
    await expect.poll(bg).toBe('#f5f1e8')
  })

  test('onboarding no longer asks for a reminder time, and the paywall has room between its buttons', async ({ page }) => {
    await page.goto('/')
    for (const b of ['Continue', 'Continue', 'Continue', 'Next']) await tap(page, b)
    await tap(page, /Stoicism/, 'radio')
    await tap(page, 'Get Started')
    const trial = await page.getByRole('button', { name: 'Start Free Trial' }).boundingBox()
    const life = await page.getByRole('button', { name: /Get Lifetime/ }).boundingBox()
    expect(life!.y - (trial!.y + trial!.height)).toBeGreaterThanOrEqual(10)
  })
})

test.describe('Empty Lagos', () => {
  test('with no Lagos yet, a tip points to the Gallery', async ({ page }) => {
    await page.goto('/')
    for (const b of ['Continue', 'Continue', 'Continue', 'Next']) await tap(page, b)
    await tap(page, /Stoicism/, 'radio')
    await tap(page, 'Get Started')
    await tap(page, 'Start Free Trial')
    await tab(page, 'Lagos')
    await expect(page.getByText('No Lagos yet')).toBeVisible()
    await page.getByRole('button', { name: 'Dismiss' }).click().catch(() => undefined) // the Home Screen hint can sit over the tip
    await tap(page, /Quick tip/)
    await expect(page.getByRole('heading', { name: 'Gallery' })).toBeVisible()
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

  test('new Lago form creates a Lago; the Gallery has no ranking, and categories end in See more', async ({ page }) => {
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
    await expect(page.getByRole('heading', { name: 'Featured' })).toBeVisible()
    await expect(page.getByText('Top Lagos')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Challenge See more/ })).toBeVisible()
    await tap(page, /Walk 10,000 steps/)
    await expect(page.getByRole('dialog').getByText(/Participants/)).toHaveCount(0)
  })
})

test.describe('Ondas', () => {
  test.beforeEach(async ({ page }) => {
    await seedDemo(page)
  })

  test('Ondas tab: banner, four tiles, and Today with one list at a time', async ({ page }) => {
    await expect(page.getByText('2 of 5 practices')).toBeVisible()
    for (const tile of ['Immerse', 'Journal', 'Philosophy', 'Rules']) await expect(page.getByRole('button', { name: tile, exact: true })).toBeVisible()
    await tap(page, 'Voluntary discomfort Midday · Fast or go without', 'checkbox')
    await expect(page.getByText('3 of 5 practices')).toBeVisible()
    await tap(page, 'Tasks', 'tab')
    await expect(page.getByRole('checkbox', { name: /Morning premeditation/ })).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: /Read one Letter from Seneca/ })).toBeVisible()
  })

  test('Rules can be kept on their own page; Journal and Philosophy are full pages; the Onda card opens the full guide', async ({ page }) => {
    await tap(page, 'Rules')
    await expect(page.getByText('Complain to no one, not even yourself')).toBeVisible()
    // each rule can be ticked for today, and the count follows
    await expect(page.getByRole('checkbox')).toHaveCount(6)
    await expect(page.getByText('0 of 6 rules kept')).toBeVisible()
    await page.getByRole('checkbox', { name: /Complain to no one/ }).click()
    await expect(page.getByRole('checkbox', { name: /Complain to no one/ })).toBeChecked()
    await expect(page.getByText('1 of 6 rules kept')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await tap(page, 'Back')
    await tap(page, 'Philosophy')
    await expect(page.getByRole('heading', { name: 'Philosophy' })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // a list of ideas: the first is open, the others open on a tap, and each has something to try
    const ideas = page.getByRole('button', { expanded: false })
    await expect(page.getByRole('button', { expanded: true })).toHaveCount(1)
    await ideas.first().click()
    await expect(page.getByRole('button', { expanded: true })).toHaveCount(2)
    await page.getByRole('checkbox').first().click()
    await expect(page.getByText('1 thing to try today')).toBeVisible()
    await tap(page, 'Back')
    await page.getByRole('button', { name: /Onda · Day 4 of 14/ }).click()
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toBeVisible()
    await tap(page, 'Back')
    await expect(page.getByText('Onda · Day 4 of 14')).toBeVisible()
  })

  test('Today page, Full guide with nine tabs, and the immersion library with its quick sheet', async ({ page }) => {
    await tap(page, 'Browse Ondas')
    await tap(page, /Stoicism/)
    await settle(page, 900)
    await expect(page.getByRole('heading', { name: 'Day 4 of 14' })).toBeVisible()
    await expect(page.getByText('Today: Premeditation of evils')).toBeVisible()
    await expect(page.getByText('Quote of the day')).toBeVisible()
    await expect(page.getByText('Word of the day')).toBeVisible()
    for (const s of ['Practices', 'Rules', 'Tasks', 'Immerse', 'Think about']) await expect(page.getByRole('heading', { name: s, exact: true })).toBeVisible()

    await page.getByRole('button', { name: /Full guide Context, history/ }).click()
    // The guide is a full page now, with its own back button
    const guide = page
    await expect(guide.getByRole('tab', { name: 'Overview', exact: true })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    for (const t of ['Overview', 'History', 'Ideas', 'Ethics', 'Practices', 'Culture', 'Travel', 'Language', 'Facts']) await expect(guide.getByRole('tab', { name: t, exact: true })).toBeVisible()
    await guide.getByRole('tab', { name: 'History', exact: true }).click()
    await guide.getByRole('button', { name: /c\. 300 BCE/ }).click()
    await expect(guide.getByText(/The school took its name from the porch/)).toBeVisible()
    await guide.getByRole('tab', { name: 'Language', exact: true }).click()
    await expect(guide.getByText('Prohairesis')).toBeVisible()
    // Long tabs are split into sections you can jump between
    // Ethics has its own tab; practices, rules and customs share another; Travel lists festivals and places
    await guide.getByRole('tab', { name: 'Ethics', exact: true }).click()
    await expect(guide.getByText('Virtue is the only good')).toBeVisible()
    await guide.getByRole('tab', { name: 'Travel', exact: true }).click()
    await expect(guide.getByRole('button', { name: /^Festivals and calendar/ }).first()).toBeVisible()
    await expect(guide.getByText('The Painted Porch')).toBeVisible()
    await guide.getByRole('tab', { name: 'Practices', exact: true }).click()
    await expect(guide.getByRole('group', { name: 'Jump to' })).toBeVisible()
    await guide.getByRole('group', { name: 'Jump to' }).getByRole('button', { name: /^Rules/ }).click()
    await expect(guide.getByRole('button', { name: /^Rules/, expanded: true }).first()).toBeVisible()
    await tap(page, 'Back')

    await tap(page, 'See All')
    await expect(page.getByText('Immersion', { exact: true })).toBeVisible()
    // Two per row: Read, Watch, Listen, Art, Eat, Drink, Customs, Games, Travel, Words
    for (const c of ['Read', 'Watch', 'Listen', 'Art', 'Eat', 'Drink', 'Customs', 'Games', 'Travel', 'Words']) await expect(page.getByRole('button', { name: new RegExp('^' + c + ' \\d+ of \\d+') })).toBeVisible()
    await tap(page, /^Eat \d+ of \d+/)
    await expect(page.getByText('Lentil soup', { exact: true })).toBeVisible()
    await expect(page.getByText('Meditations', { exact: true })).toHaveCount(0)
    // Tapping an item opens a small sheet with its description
    await tap(page, /^About Lentil soup/)
    const info = page.getByRole('dialog')
    await expect(info.getByRole('heading', { name: 'Lentil soup' })).toBeVisible()
    await info.getByRole('button', { name: 'Mark as experienced' }).click()
    await expect(info.getByRole('button', { name: 'Experienced' })).toBeVisible()
    await tap(page, 'Close')
    await expect(page.getByRole('checkbox', { name: 'Mark Lentil soup done' })).toBeChecked()
    await tap(page, 'Back')
    await expect(page.getByRole('button', { name: /^Eat 1 of \d+/ })).toBeVisible()
    // Back returns to the screen you came from
    await tap(page, 'Back')
    await expect(page.getByRole('heading', { name: 'Day 4 of 14' })).toBeVisible()
  })

  test('journal lists past entries, and saving a new one returns to the list', async ({ page }) => {
    await tap(page, 'Journal')
    await expect(page.getByText('Day 3 · Stoicism')).toBeVisible()
    await expect(page.getByText('Day 1 · Stoicism')).toBeVisible()
    await page.getByRole('button', { name: 'New Entry', exact: true }).click()
    await settle(page, 900)
    const editor = page.getByRole('dialog', { name: 'Journal' })
    await expect(editor.getByText('Day 4 · Stoicism')).toBeVisible()
    await expect(editor.getByText('Practiced today')).toBeVisible()
    await editor.getByRole('textbox').fill('The meeting I dreaded went fine.')
    await editor.getByRole('button', { name: 'Save' }).click()
    await settle(page, 900)
    await expect(page.getByText('The meeting I dreaded went fine.')).toBeVisible()
  })

  test('browsing another Onda previews it; beginning it ends the current one', async ({ page }) => {
    await startTrial(page)
    await tap(page, 'Browse Ondas')
    await expect(page.getByText('Sixty worlds to live in')).toBeVisible()
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
    await tap(page, 'Browse Ondas')
    await tap(page, /Stoicism/)
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
    await tap(page, 'All', 'tab')
    await expect(page.getByText('Best Streak')).toBeVisible()

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
    await tap(page, 'Start Now')
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

test.describe('Update 5.0', () => {
  test('holding a practice opens How to do this; a tap still ticks it', async ({ page }) => {
    await seedDemo(page)
    await tab(page, 'Ondas')
    const row = page.locator('[role=checkbox][aria-haspopup=menu]').first()
    await row.scrollIntoViewIfNeeded()
    const before = await row.getAttribute('aria-checked')
    await row.dispatchEvent('contextmenu')
    await tap(page, 'How to do this', 'menuitem')
    await expect(page.getByText('Why', { exact: true }).first()).toBeVisible()
    await expect(row).toHaveAttribute('aria-checked', before ?? 'false')
  })

  test('Settings shows version 5.0 and the theme colour follows light and dark', async ({ page }) => {
    await seedDemo(page)
    await tap(page, 'Settings')
    await expect(page.getByText('Onda 5.0')).toBeVisible()
    const bar = () => page.evaluate(() => [document.querySelectorAll('meta[name="theme-color"]').length, document.querySelector('meta[name="theme-color"]')?.getAttribute('content'), document.querySelector('meta[name="color-scheme"]')?.getAttribute('content'), getComputedStyle(document.documentElement).backgroundColor].join('|'))
    await tap(page, /^Appearance/)
    await tap(page, 'Dark', 'tab')
    await expect.poll(async () => (await bar()).split('|')[2]).toBe('dark')
    const dark = await bar()
    await tap(page, 'Light', 'tab')
    await expect.poll(async () => (await bar()).split('|')[2]).toBe('light')
    const light = await bar()
    expect(dark.split('|')[0]).toBe('1')
    expect(light.split('|')[1]).not.toBe(dark.split('|')[1])
  })
})
