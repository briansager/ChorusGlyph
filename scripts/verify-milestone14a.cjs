/* Optional browser QA. Uses an existing Playwright installation, without adding
 * a project dependency. Start Vite, then set PLAYWRIGHT_MODULE if needed. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const output = path.resolve('artifacts/milestone-14a')
fs.mkdirSync(output, { recursive: true })
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5173'
const report = { viewports: [], flows: [], contrast: [], errors: [] }

async function tabTo(page, locator) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await locator.evaluate((element) => document.activeElement === element)) return
    await page.keyboard.press('Tab')
  }
  throw new Error(`Could not reach control by Tab: ${locator}`)
}

async function enterText(page, locator, text) {
  await tabTo(page, locator)
  await page.keyboard.press('Control+A')
  await page.keyboard.insertText(text)
}

async function auditLayout(page, name) {
  const result = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    controlsOutsidePanels: [...document.querySelectorAll('button, input, select, textarea')].filter((element) => {
      const rect = element.getBoundingClientRect()
      const panel = element.closest('section').getBoundingClientRect()
      return rect.width && (rect.left < panel.left - 1 || rect.right > panel.right + 1)
    }).map((element) => element.outerHTML.slice(0, 100)),
  }))
  assert.equal(result.scrollWidth, result.width, `${name}: page overflow`)
  assert.deepEqual(result.controlsOutsidePanels, [], `${name}: controls outside panel`)
  report.viewports.push({ name, ...result })
}

async function auditContrast(page, name) {
  const result = await page.evaluate(() => {
    const rgb = (value) => value.match(/[\d.]+/g).map(Number)
    const composite = (front, back) => front.slice(0, 3).map((channel, i) => channel * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1)))
    const background = (element) => {
      if (!element) return [255, 255, 255]
      const color = rgb(getComputedStyle(element).backgroundColor)
      return composite(color, background(element.parentElement))
    }
    const luminance = (color) => color.map((value) => {
      value /= 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0)
    const ratio = (front, back) => {
      const a = luminance(front), b = luminance(back)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }
    const checked = [], failures = []
    for (const element of document.querySelectorAll('body *')) {
      const style = getComputedStyle(element)
      if (!element.getClientRects().length || style.visibility === 'hidden' || element.closest('.sr-only') || ['SCRIPT', 'STYLE', 'OPTION', 'SVG', 'PATH'].includes(element.tagName.toUpperCase())) continue
      const text = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join('').trim()
      if (!text && !element.matches('input:not([type=range]):not([type=radio]):not([type=file]), textarea, select')) continue
      const back = background(element), fore = composite(rgb(style.color), back)
      const contrast = ratio(fore, back)
      const item = { text: (text || element.getAttribute('aria-label') || element.id).slice(0, 80), ratio: +contrast.toFixed(2) }
      checked.push(item)
      if (contrast < 4.5) failures.push(item)
    }
    const token = (name) => rgb(getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i, (_, r, g, b) => `rgb(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)})`))
    const boundaries = ['--surface-default', '--surface-raised'].map((surface) => ({
      surface,
      border: +ratio(token('--border-control'), token(surface)).toFixed(2),
      focus: +ratio(token('--focus-ring'), token(surface)).toFixed(2),
      selected: +ratio(token('--accent-link'), token(surface)).toFixed(2),
    }))
    return { checked: checked.length, minimum: Math.min(...checked.map((item) => item.ratio)), failures, boundaries }
  })
  assert.deepEqual(result.failures, [], `${name}: text contrast`)
  assert.ok(result.boundaries.every((item) => item.border >= 3 && item.focus >= 3 && item.selected >= 3))
  report.contrast.push({ name, ...result })
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
    page.on('pageerror', (error) => report.errors.push(error.message))
    const external = []
    await page.route('**/*', (route) => {
      if (new URL(route.request().url()).origin !== base) {
        external.push(route.request().url())
        return route.abort()
      }
      return route.continue()
    })
    await page.goto(base)
    await page.getByRole('heading', { name: 'Lyric workspace' }).waitFor()
    const active = page.getByRole('region', { name: 'Synchronized lyrics' })
    const multilingual = '[00:00.00]青い朝が来る\n[00:04.50]蓝色的早晨来了\n[00:09.00]푸른 아침이 와요\n[00:13.75]สวัสดีตอนเช้า e\u0301 a\u0308'
    await enterText(page, page.getByLabel('Timed LRC text', { exact: true }), multilingual)
    await tabTo(page, page.getByRole('button', { name: 'Load pasted text' }))
    await page.keyboard.press('Enter')
    await active.getByText('青い朝が来る', { exact: true }).waitFor()
    assert.match(await active.innerText(), /Source: Pasted text/)
    const original = await active.locator('.lyric-line').allTextContents()
    report.flows.push('Keyboard paste loading; Japanese, Chinese, Korean, Thai and combining marks')

    const demo = page.getByRole('button', { name: 'Use demo now-playing data' })
    await tabTo(page, demo)
    await page.keyboard.press('Enter')
    await page.getByRole('heading', { name: 'Demo morning track' }).waitFor()
    assert.ok(await demo.evaluate((element) => document.activeElement === element))
    assert.ok(await page.getByRole('radio', { name: 'Manual', exact: true }).isChecked())
    assert.equal(await page.getByText('Connection: Not connected.').count(), 1)
    await tabTo(page, page.getByRole('button', { name: 'Select suggestion' }))
    await page.keyboard.press('Enter')
    assert.equal(await page.getByRole('button', { name: 'Suggestion selected' }).getAttribute('aria-pressed'), 'true')
    await tabTo(page, page.getByRole('button', { name: 'Edit details' }))
    await page.keyboard.press('Enter')
    const longTitle = '長い曲名と歌詞の候補 '.repeat(12)
    await enterText(page, page.getByLabel('Edit candidate title'), longTitle)
    await enterText(page, page.getByLabel('Edit candidate artist'), 'Long artist name '.repeat(12))
    await tabTo(page, page.getByRole('button', { name: 'Prepare lyric search' }))
    await page.keyboard.press('Enter')
    const search = page.getByRole('button', { name: 'Search LRCLIB', exact: true })
    assert.ok(await search.evaluate((element) => document.activeElement === element))
    assert.equal(await page.getByLabel('LRCLIB track title').inputValue(), longTitle)
    assert.deepEqual(await active.locator('.lyric-line').allTextContents(), original)
    assert.equal(external.length, 0, 'Metadata preparation must not make external requests')
    const focus = await search.evaluate((element) => ({ width: getComputedStyle(element).outlineWidth, color: getComputedStyle(element).outlineColor, offset: getComputedStyle(element).outlineOffset }))
    assert.deepEqual(focus, { width: '2px', color: 'rgb(185, 217, 255)', offset: '2px' })
    report.flows.push('Keyboard suggestion selection/editing/preparation; no request or lyric change; explicit visible focus')

    await tabTo(page, page.getByRole('button', { name: 'Cancel candidate search' }))
    await page.keyboard.press('Enter')
    assert.ok(await search.evaluate((element) => document.activeElement === element))
    assert.deepEqual(await active.locator('.lyric-line').allTextContents(), original)
    report.flows.push('Keyboard candidate cancellation preserves active lyrics and search focus')
    await page.keyboard.press('Enter')
    await page.getByRole('alert').filter({ hasText: 'Enter a track title' }).waitFor()
    await auditContrast(page, 'validation error and default controls')
    await search.hover()
    assert.equal(await search.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(29, 78, 216)')
    await auditContrast(page, 'primary hover')
    await page.mouse.down()
    assert.equal(await search.evaluate((element) => getComputedStyle(element).backgroundColor), 'rgb(30, 64, 175)')
    await auditContrast(page, 'primary pressed')
    await page.mouse.up()
    await page.mouse.move(0, 0)

    await tabTo(page, page.getByRole('slider', { name: 'Timing offset' }))
    await page.keyboard.press('ArrowRight')
    assert.equal(await page.getByRole('spinbutton', { name: 'Offset (seconds)' }).inputValue(), '0.05')
    await enterText(page, page.getByRole('spinbutton', { name: 'Offset (seconds)' }), '-1.25')
    await page.keyboard.press('Tab')
    assert.equal(await page.getByRole('slider', { name: 'Timing offset' }).inputValue(), '-1.25')
    await tabTo(page, page.getByRole('button', { name: 'Reset offset' }))
    await page.keyboard.press('Enter')
    await tabTo(page, page.getByRole('button', { name: 'Start lyric preview' }))
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Pause lyric preview' }).waitFor()
    await page.keyboard.press('Enter')
    await tabTo(page, page.getByRole('button', { name: 'Restart preview' }))
    await page.keyboard.press('Enter')
    assert.equal(await page.getByLabel('Current timer position').innerText(), '0.00s')
    await tabTo(page, page.getByRole('combobox', { name: 'Reading language' }))
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    assert.equal(await page.getByRole('combobox', { name: 'Reading language' }).inputValue(), 'korean-local')
    report.flows.push('Keyboard range, numeric offset, reset, preview start/pause/restart and native language select')

    await tabTo(page, page.getByRole('button', { name: 'Korean', exact: true }))
    await page.keyboard.press('Enter')
    await tabTo(page, page.getByRole('button', { name: 'Compare providers', exact: true }))
    await page.keyboard.press('Enter')
    await page.locator('.reading-output').waitFor()
    assert.match(await page.locator('.reading-output').innerText(), /pureun/i)
    await enterText(page, page.getByLabel('Original test text'), '東京')
    assert.ok(await page.getByRole('button', { name: 'Compare providers', exact: true }).isDisabled())
    await tabTo(page, page.getByRole('radio', { name: 'Choose Japanese' }))
    await page.keyboard.press('Space')
    await page.keyboard.press('ArrowRight')
    assert.ok(await page.getByRole('radio', { name: 'Choose Chinese' }).isChecked())
    await tabTo(page, page.getByRole('button', { name: 'Compare providers', exact: true }))
    await page.keyboard.press('Enter')
    await page.locator('.reading-output').waitFor()
    await auditContrast(page, 'success, selected controls and readings')
    await page.waitForFunction(() => !document.querySelector('#comparison .action-row button').disabled)
    await tabTo(page, page.getByRole('button', { name: 'Compare providers', exact: true }))
    await page.keyboard.press('Enter')
    await page.getByText('Cached locally', { exact: true }).waitFor()
    await auditContrast(page, 'cached output')
    report.flows.push('Keyboard comparison, Han-only clarification and native radio arrow keys; Azure not called')

    await tabTo(page, page.getByLabel('Local LRC file', { exact: true }))
    const chooserPromise = page.waitForEvent('filechooser')
    await page.keyboard.press('Enter')
    await (await chooserPromise).setFiles({ name: 'long-local-lyrics-歌詞.lrc', mimeType: 'text/plain', buffer: Buffer.from(multilingual) })
    await tabTo(page, page.getByRole('button', { name: 'Load local file' }))
    await page.keyboard.press('Enter')
    await active.getByText('Source: Local LRC file', { exact: true }).waitFor()
    assert.deepEqual(await active.locator('.lyric-line').allTextContents(), original)
    report.flows.push('Keyboard activation of file chooser and explicit file load (fixture file supplied by automation)')

    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await auditLayout(page, `${width}px with long edited metadata and multilingual lyrics`)
      await page.screenshot({ path: path.join(output, `workspace-${width}.png`), fullPage: true })
    }
    await page.setViewportSize({ width: 320, height: 1000 })
    await page.evaluate(() => {
      const styles = [...document.querySelectorAll('body *')].map((element) => [element, getComputedStyle(element).fontSize, getComputedStyle(element).lineHeight])
      for (const [element, size, line] of styles) {
        element.style.fontSize = `${parseFloat(size) * 2}px`
        if (line.endsWith('px')) element.style.lineHeight = `${parseFloat(line) * 2}px`
      }
    })
    await auditLayout(page, '320px with 200% text and line-height stress')
    await page.screenshot({ path: path.join(output, 'workspace-320-text-200.png'), fullPage: true })
    assert.equal(await page.locator('button').first().evaluate((element) => getComputedStyle(element).transitionDuration), '0s')
    assert.equal(external.length, 0)
    assert.deepEqual(report.errors, [])
    report.flows.push('Reduced-motion transitions disabled; no page errors or external requests during tested local workflows')

    await page.setViewportSize({ width: 960, height: 620 })
    await page.setContent(`<html><body style="margin:0;background:#080F1E;color:#F1F5FC;font:16px 'Segoe UI',sans-serif;padding:24px"><h1>Timed Glyph · size inspection</h1><div style="display:flex;align-items:end;gap:32px;padding:24px">${[16, 20, 24, 32, 48].map((size) => `<div><img width="${size}" height="${size}" src="${base}/timed-glyph-dark.svg"><p>${size}px</p></div>`).join('')}<div><img width="16" height="16" src="${base}/favicon.svg"><p>16px favicon</p></div></div><img width="388" height="80" src="${base}/timed-glyph-wordmark-dark.svg"><div style="background:white;padding:24px;margin-top:24px"><img width="48" height="48" src="${base}/timed-glyph.svg"><img width="388" height="80" src="${base}/timed-glyph-wordmark-light.svg"></div></body></html>`)
    await page.screenshot({ path: path.join(output, 'brand-sizes.png') })
    fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
  } finally { await browser.close() }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
