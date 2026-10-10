import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { clientRuntime, componentClientSource, createComponentRegistry, defineComponent, escapeHtml } from '../src/index.js'

test('real browser suite is optional and explicit', async () => {
  let playwright
  try { playwright = await import('playwright') } catch { test.skip('Install playwright to run real browser coverage'); return }
  if (!playwright.chromium) { test.skip('Chromium is unavailable'); return }
  const browser = await playwright.chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setContent(`<main data-agent-outlet><div data-agent-component="demo"><button data-action="increment">Count: 0</button></div></main><script>window.Ligature={mounted:new Set(),mount(root=document){root.querySelectorAll('[data-agent-component]').forEach(el=>{if(this.mounted.has(el))return;this.mounted.add(el);el.dataset.mounted='true'})},unmount(root=document){root.querySelectorAll('[data-agent-component]').forEach(el=>{this.mounted.delete(el);el.dataset.unmounted='true'})}};document.addEventListener('DOMContentLoaded',()=>window.Ligature.mount())</script>`)
  await page.evaluate(() => window.Ligature.mount(document))
  await page.waitForSelector('[data-agent-component][data-mounted="true"]')
  await page.evaluate(() => window.Ligature.unmount(document))
  assert.equal(await page.locator('[data-agent-component]').getAttribute('data-unmounted'), 'true')
  await page.evaluate(() => window.Ligature.mount(document))
  assert.equal(await page.locator('[data-agent-component]').getAttribute('data-mounted'), 'true')
  await browser.close()
})

test('progressive enhancement updates server HTML in place without hydration', async () => {
  let playwright
  try { playwright = await import('playwright') } catch { test.skip('Install playwright to run real browser coverage'); return }
  if (!playwright.chromium) { test.skip('Chromium is unavailable'); return }
  const component = defineComponent({
    name: 'enhance-demo',
    props: { label: { required: true, type: 'string' } },
    client: { enhance(element, state) { element.dataset.enhanced = state.label } },
    render: props => `<p>${escapeHtml(props.label)}</p>`
  })
  const html = createComponentRegistry().register(component).render('enhance-demo', { label: 'Server label' })
  const browser = await playwright.chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.setContent(`<main>${html}</main><script>${clientRuntime()}</script><script>${componentClientSource(component)}</script>`)
    await page.waitForSelector('[data-agent-component][data-enhanced="Server label"]')
    assert.equal(await page.locator('[data-agent-component] p').textContent(), 'Server label')
  } finally { await browser.close() }
})

test('browser lifecycle transitions commit in order and clean failed mounts', async () => {
  let playwright
  try { playwright = await import('playwright') } catch { test.skip('Install playwright to run real browser coverage'); return }
  if (!playwright.chromium) { test.skip('Chromium is unavailable'); return }
  const component = defineComponent({
    name: 'lifecycle-demo',
    client: {
      mount(element) { window.lifecycle.push('mount'); element.dataset.ready = 'true' },
      update(element, props, state) { window.lifecycle.push(`update:${state.value}`); element.dataset.value = props.value },
      unmount() { window.lifecycle.push('unmount') }
    },
    render: () => '<p>Lifecycle</p>'
  })
  const html = createComponentRegistry().register(component).render('lifecycle-demo', { value: 'initial' })
  const browser = await playwright.chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.setContent(`<main>${html}</main><script>window.lifecycle=[]</script><script>${clientRuntime()}</script><script>${componentClientSource(component)}</script>`)
    await page.waitForSelector('[data-agent-component][data-ready="true"]')
    const element = page.locator('[data-agent-component]')
    await page.evaluate(() => window.Ligature.update(document.querySelector('[data-agent-component]'), { value: 'next' }))
    await page.evaluate(() => window.Ligature.unmount(document))
    assert.deepEqual(await page.evaluate(() => window.lifecycle), ['mount', 'update:next', 'unmount'])

    const failing = defineComponent({
      name: 'failing-lifecycle',
      client: { mount() { window.lifecycle.push('failed-mount'); throw new Error('boom') }, unmount() { window.lifecycle.push('failed-unmount') } },
      render: () => '<p>Failure</p>'
    })
    const failingHtml = createComponentRegistry().register(failing).render('failing-lifecycle', {})
    await page.evaluate(({ source, html: nextHtml }) => {
      document.querySelector('main').innerHTML = nextHtml
      const script = document.createElement('script'); script.textContent = source; document.body.append(script)
    }, { source: componentClientSource(failing), html: failingHtml })
    await page.waitForTimeout(0)
    assert.deepEqual(await page.evaluate(() => window.lifecycle.slice(-2)), ['failed-mount', 'failed-unmount'])
  } finally { await browser.close() }
})

test('browser lifecycle errors report component, phase, and DOM location', async () => {
  let playwright
  try { playwright = await import('playwright') } catch { test.skip('Install playwright to run real browser coverage'); return }
  if (!playwright.chromium) { test.skip('Chromium is unavailable'); return }
  const component = defineComponent({
    name: 'reported-failure',
    client: {
      onError(error) { window.runtimeError = { name: error.name, component: error.component, phase: error.phase, location: error.location, message: error.message } },
      mount() { throw new Error('boom') }
    },
    render: () => '<p>Failure</p>'
  })
  const html = createComponentRegistry().register(component).render('reported-failure')
  const browser = await playwright.chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.setContent(`<main id="app">${html}</main><script>${clientRuntime()}</script><script>${componentClientSource(component)}</script>`)
    await page.waitForTimeout(0)
    const diagnostic = await page.evaluate(() => window.runtimeError)
    assert.equal(diagnostic.name, 'LigatureRuntimeError')
    assert.equal(diagnostic.component, 'reported-failure')
    assert.equal(diagnostic.phase, 'mount')
    assert.match(diagnostic.location, /#app|main:nth-of-type\(1\)/)
    assert.match(diagnostic.message, /reported-failure.*mount.*failed at/)
  } finally { await browser.close() }
})

test('browser observer reconciles dynamic insertion and removal deterministically', async () => {
  let playwright
  try { playwright = await import('playwright') } catch { test.skip('Install playwright to run real browser coverage'); return }
  if (!playwright.chromium) { test.skip('Chromium is unavailable'); return }
  const component = defineComponent({
    name: 'dynamic-demo',
    client: {
      mount(element) { window.dynamicLifecycle.push(`mount:${element.dataset.role}`) },
      unmount(element) { window.dynamicLifecycle.push(`unmount:${element.dataset.role}`) }
    },
    render: () => '<p>Dynamic</p>'
  })
  const browser = await playwright.chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.setContent(`<main id="root"></main><script>window.dynamicLifecycle=[]</script><script>${clientRuntime()}</script><script>${componentClientSource(component)}</script>`)
    await page.evaluate(() => {
      const root = document.querySelector('#root')
      const parent = document.createElement('div')
      parent.innerHTML = '<div data-agent-component="dynamic-demo" data-agent-instance="parent" data-agent-hydrate="true" data-role="parent"><p>Parent</p></div>'
      const child = document.createElement('div')
      child.innerHTML = '<div data-agent-component="dynamic-demo" data-agent-instance="child" data-agent-hydrate="true" data-role="child"><p>Child</p></div>'
      parent.firstElementChild.append(child.firstElementChild)
      root.append(parent.firstElementChild)
    })
    await page.waitForTimeout(0)
    assert.deepEqual(await page.evaluate(() => window.dynamicLifecycle), ['mount:parent', 'mount:child'])
    await page.evaluate(() => document.querySelector('[data-role="parent"]').remove())
    await page.waitForTimeout(0)
    assert.deepEqual(await page.evaluate(() => window.dynamicLifecycle), ['mount:parent', 'mount:child', 'unmount:child', 'unmount:parent'])

    await page.evaluate(() => {
      const root = document.querySelector('#root')
      const transient = document.createElement('div')
      transient.innerHTML = '<div data-agent-component="dynamic-demo" data-agent-instance="transient" data-agent-hydrate="true" data-role="transient"></div>'
      const node = transient.firstElementChild
      root.append(node)
      node.remove()
    })
    await page.waitForTimeout(0)
    assert.deepEqual(await page.evaluate(() => window.dynamicLifecycle), ['mount:parent', 'mount:child', 'unmount:child', 'unmount:parent'])
  } finally { await browser.close() }
})

test('browser keyed list updates preserve existing elements and remove lifecycle instances', async () => {
  let playwright
  try { playwright = await import('playwright') } catch { test.skip('Install playwright to run real browser coverage'); return }
  if (!playwright.chromium) { test.skip('Chromium is unavailable'); return }
  const browser = await playwright.chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.setContent(`<main id="root"><div data-agent-key="a">A</div><div data-agent-key="b">B</div></main><script>${clientRuntime()}</script>`)
    const result = await page.evaluate(() => {
      const root = document.querySelector('#root')
      const first = root.children[0]
      Ligature.updateList(root, [{ id: 'b', label: 'B2' }, { id: 'a', label: 'A2' }, { id: 'c', label: 'C' }], {
        key: item => item.id,
        render: item => { const element = document.createElement('div'); element.textContent = item.label; return element },
        update: (element, item) => { element.textContent = item.label }
      })
      const order = [...root.children].map(element => element.dataset.agentKey)
      const reused = root.children[1] === first
      Ligature.updateList(root, [{ id: 'a', label: 'A3' }], { key: item => item.id, render: () => document.createElement('div'), update: (element, item) => { element.textContent = item.label } })
      return { order, reused, remaining: root.children.length, text: root.textContent }
    })
    assert.deepEqual(result, { order: ['b', 'a', 'c'], reused: true, remaining: 1, text: 'A3' })
  } finally { await browser.close() }
})

test('browser focus and keyboard helpers manage focus boundaries and cleanup', async () => {
  let playwright
  try { playwright = await import('playwright') } catch { test.skip('Install playwright to run real browser coverage'); return }
  if (!playwright.chromium) { test.skip('Chromium is unavailable'); return }
  const component = defineComponent({
    name: 'keyboard-demo',
    client: {
      mount(element, state, lifecycle) {
        lifecycle.focusTrap(element, { initialFocus: true })
        lifecycle.keys(element, { Enter: () => { element.dataset.entered = 'true'; return false } })
      },
      unmount(element) { element.dataset.unmounted = 'true' }
    },
    render: () => '<section><button data-first>First</button><button data-last>Last</button></section>'
  })
  const html = createComponentRegistry().register(component).render('keyboard-demo')
  const browser = await playwright.chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.setContent(`<main>${html}</main><script>${clientRuntime()}</script><script>${componentClientSource(component)}</script>`)
    await page.waitForSelector('[data-agent-component] [data-first]')
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.first), '')
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.last), '')
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.first), '')
    await page.evaluate(() => document.querySelector('[data-first]').focus())
    await page.keyboard.press('Enter')
    assert.equal(await page.locator('[data-agent-component]').getAttribute('data-entered'), 'true')
    await page.evaluate(() => Ligature.unmount(document))
    await page.keyboard.press('Enter')
    assert.equal(await page.locator('[data-agent-component]').getAttribute('data-entered'), 'true')
  } finally { await browser.close() }
})

test('browser navigation emits lifecycle events and restores scroll on history traversal', async () => {
  let playwright
  try { playwright = await import('playwright') } catch { test.skip('Install playwright to run real browser coverage'); return }
  if (!playwright.chromium) { test.skip('Chromium is unavailable'); return }
  const server = http.createServer((request, response) => {
    const page = request.url === '/two' ? 'two' : 'one'
    response.setHeader('content-type', 'text/html')
    response.end(`<main data-agent-outlet style="height:2000px"><h1>${page}</h1></main>${page === 'one' ? `<script>${clientRuntime()}</script>` : ''}`)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const browser = await playwright.chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.goto(`http://127.0.0.1:${address.port}/one`)
    await page.evaluate(() => {
      window.navigationEvents = []
      for (const type of ['start', 'end', 'error']) document.addEventListener('ligature:navigation:' + type, event => window.navigationEvents.push(type + ':' + event.detail.mode))
    })
    await page.evaluate(() => { window.scrollTo(0, 420) })
    await page.evaluate(() => Ligature.navigate('/two'))
    assert.equal(await page.locator('h1').textContent(), 'two')
    assert.equal(await page.evaluate(() => scrollY), 0)
    await page.evaluate(() => { window.scrollTo(0, 260); return new Promise(resolve => { addEventListener('scroll', resolve, { once: true }); setTimeout(resolve, 20) }) })
    await page.goBack()
    await page.waitForURL(/\/one$/)
    await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'one' && scrollY === 420)
    assert.deepEqual(await page.evaluate(() => window.navigationEvents), ['start:push', 'end:push', 'start:pop', 'end:pop'])
  } finally {
    await browser.close()
    server.close()
  }
})
