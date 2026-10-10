import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { clientRuntime, componentClientSource, createComponentRegistry, defineComponent, escapeHtml } from '../src/index.js'

const engines = [
  ['Chromium', 'chromium'],
  ['Firefox', 'firefox'],
  ['WebKit (Safari)', 'webkit']
]

for (const [label, engineName] of engines) {
  test(`browser compatibility smoke contract: ${label}`, async t => {
    let playwright
    try {
      playwright = await import('playwright')
    } catch {
      t.skip('Install playwright to run browser compatibility coverage')
      return
    }

    const browserType = playwright[engineName]
    assert.ok(browserType, `Playwright must expose the ${engineName} browser type`)
    if (!existsSync(browserType.executablePath())) {
      t.skip(`Install the Playwright ${engineName} browser to run this compatibility check`)
      return
    }

    const lifecycle = defineComponent({
      name: `compatibility-${engineName}`,
      props: { label: { required: true, type: 'string' } },
      client: {
        enhance(element, state) { element.dataset.enhanced = state.label },
        mount(element) { element.dataset.mounted = 'true' },
        unmount() { window.compatibilityUnmounted = true }
      },
      render: props => `<button type="button">${escapeHtml(props.label)}</button>`
    })
    const html = createComponentRegistry().register(lifecycle).render(`compatibility-${engineName}`, { label: 'Works' })
    const browser = await browserType.launch({ headless: true })
    const page = await browser.newPage()
    try {
      await page.setContent(`<main id="root">${html}</main><script>${clientRuntime()}</script><script>${componentClientSource(lifecycle)}</script>`)
      const component = page.locator('[data-agent-component]')
      await component.waitFor()
      assert.equal(await component.getAttribute('data-enhanced'), 'Works')
      assert.equal(await component.getAttribute('data-mounted'), 'true')
      assert.equal(await component.locator('button').textContent(), 'Works')

      await page.evaluate(() => document.querySelector('[data-agent-component]').remove())
      await page.waitForTimeout(0)
      assert.equal(await page.evaluate(() => window.compatibilityUnmounted), true)
    } finally {
      await browser.close()
    }
  })
}
