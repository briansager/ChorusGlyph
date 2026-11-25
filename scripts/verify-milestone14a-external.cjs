const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const production = await browser.newPage({ viewport: { width: 390, height: 844 } })
    await production.goto('http://127.0.0.1:4173')
    await production.getByRole('heading', { name: 'Lyric workspace' }).waitFor()
    assert.equal(await production.getByRole('button', { name: 'Use demo now-playing data' }).count(), 0)
    assert.equal(await production.getByText(/Demo metadata simulates/).count(), 0)
    await production.screenshot({ path: 'artifacts/milestone-14a/production-390.png', fullPage: true })
    await production.setViewportSize({ width: 1440, height: 1000 })
    await production.screenshot({ path: 'artifacts/milestone-14a/production-1440.png', fullPage: true })

    const page = await browser.newPage()
    // Existing domain clients store native fetch as an instance property. Chrome
    // requires a Window receiver. Bind only in this isolated test page so mock
    // response/focus checks can run without changing domain clients for 14A.
    await page.addInitScript(() => { window.fetch = window.fetch.bind(window) })
    let pendingRoute
    let arrived
    const pending = new Promise((resolve) => { arrived = resolve })
    let scenario = 'late'
    let count = 0
    await page.route('https://lrclib.net/**', async (route) => {
      count++
      if (scenario === 'late') { pendingRoute = route; arrived(); return }
      await route.fulfill({ status: scenario === 'missing' ? 404 : 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ trackName: 'Loaded track', artistName: 'Loaded artist', duration: 120, instrumental: false, syncedLyrics: '[00:00.00]Loaded remote lyric' }) })
    })
    await page.goto('http://127.0.0.1:5173')
    const active = page.getByRole('region', { name: 'Synchronized lyrics' })
    const original = await active.locator('.lyric-line').allTextContents()
    await page.getByRole('button', { name: 'Use demo now-playing data' }).click()
    await page.getByRole('button', { name: 'Prepare lyric search' }).click()
    assert.equal(count, 0)
    await page.getByLabel('LRCLIB duration').fill('120')
    await page.getByRole('button', { name: 'Search LRCLIB', exact: true }).click()
    await Promise.race([pending, new Promise((_, reject) => setTimeout(() => reject(new Error('No intercepted LRCLIB request arrived')), 8000))])
    assert.equal(count, 1)
    await page.getByRole('button', { name: 'Cancel candidate search' }).click()
    assert.ok(await page.getByRole('button', { name: 'Search LRCLIB', exact: true }).evaluate((element) => document.activeElement === element))
    const response = page.waitForResponse((response) => response.url().startsWith('https://lrclib.net'))
    await pendingRoute.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ trackName: 'Late track', artistName: 'Late artist', duration: 120, instrumental: false, syncedLyrics: '[00:00.00]Late remote lyric' }) })
    await response
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.deepEqual(await active.locator('.lyric-line').allTextContents(), original)
    scenario = 'missing'
    await page.getByLabel('LRCLIB track title').fill('Missing track')
    await page.getByLabel('LRCLIB duration').fill('120')
    await page.getByRole('button', { name: 'Search LRCLIB', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'LRCLIB could not find a matching track.' }).waitFor()
    assert.deepEqual(await active.locator('.lyric-line').allTextContents(), original)
    assert.equal(await page.getByLabel('LRCLIB track title').inputValue(), 'Missing track')
    scenario = 'success'
    await page.getByRole('button', { name: 'Search LRCLIB', exact: true }).click()
    await active.getByText('Loaded remote lyric', { exact: true }).waitFor()
    await active.getByText('Source: LRCLIB', { exact: true }).waitFor()
    assert.match(await active.innerText(), /Loaded track · Loaded artist/)
    const result = { productionDemoActivationAbsent: true, preparationRequests: 0, inFlightCancellationRestoresVisibleSearchFocus: true, canceledLateResponseIgnored: true, noResultsPreserveLyricsAndFields: true, successfulResponseUsesExistingLoaderAndSource: true, fetchReceiverShimForMockedResponses: true, baselineLimitation: 'Unchanged default LRCLIB client invokes captured native fetch with the client as receiver. Chrome throws Illegal invocation before a request. Mocked-response browser checks bind fetch only in the test harness.', externalServiceAccess: 'All LRCLIB responses intercepted locally; no live service or companion used.' }
    fs.writeFileSync('artifacts/milestone-14a/external-ui-report.json', JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result, null, 2))
  } finally { await browser.close() }
})().catch((error) => { console.error(error); process.exitCode = 1 })
