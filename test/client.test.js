import test from 'node:test'
import assert from 'node:assert/strict'
import { clientRuntime, createControl, createStore, createOptimistic, createResource, createResourceCache, createStateInspector, createForm, updateIn } from '../src/index.js'

test('optimistic updates commit server data and roll back failed mutations', async () => {
  const optimistic = createOptimistic({ count: 0 })
  const seen = []
  optimistic.subscribe(state => seen.push({ ...state }))
  assert.deepEqual(await optimistic.update(state => ({ count: state.count + 1 }), value => ({ count: value.count + 1 })), { count: 2 })
  assert.deepEqual(optimistic.state.data, { count: 2 })
  const failure = new Error('conflict')
  await assert.rejects(optimistic.update(state => ({ count: state.count + 1 }), () => Promise.reject(failure)), failure)
  assert.deepEqual(optimistic.state.data, { count: 2 })
  assert.equal(optimistic.state.error, failure)
  assert.equal(seen[0].pending, true)
  assert.equal(seen[1].pending, false)
  assert.equal(Object.isFrozen(optimistic.state), true)
  assert.throws(() => optimistic.update(null, () => {}), /optimistic.update must be a function/)
  assert.throws(() => optimistic.update(state => state, null), /optimistic.mutation must be a function/)
  assert.throws(() => optimistic.subscribe(true), /requires a function/)
})

test('forms track values, dirty/touched state, validation, submit, and reset', async () => {
  const submitted = []
  const seen = []
  const form = createForm({ email: '', name: '' }, {
    validate: values => ({ ...(values.email.includes('@') ? {} : { email: 'Enter a valid email' }), ...(values.name ? {} : { name: 'Required' }) }),
    onSubmit: values => submitted.push(values)
  })
  form.subscribe(state => seen.push(state))
  assert.equal(form.state.dirty, false)
  form.set('email', 'ada@example.com')
  form.touch('email')
  assert.equal(form.state.dirty, true)
  assert.equal(form.state.touched.email, true)
  assert.deepEqual(form.validate(), { name: 'Required' })
  assert.equal(await form.submit(), false)
  assert.equal(form.state.submitted, false)
  form.set('name', 'Ada')
  assert.equal(await form.submit(), true)
  assert.equal(form.state.submitted, true)
  assert.deepEqual(submitted, [{ email: 'ada@example.com', name: 'Ada' }])
  assert.equal(Object.isFrozen(form.state), true)
  assert.equal(Object.isFrozen(form.state.values), true)
  form.reset()
  assert.deepEqual(form.state.values, { email: '', name: '' })
  assert.equal(form.state.dirty, false)
  assert.equal(seen.length, 8)
})

test('forms expose submission errors and reject malformed contracts', async () => {
  const failure = new Error('offline')
  const form = createForm({ value: 'ok' }, { onSubmit: () => Promise.reject(failure) })
  await assert.rejects(form.submit(), failure)
  assert.equal(form.state.errors._form, failure)
  assert.equal(form.state.submitting, false)
  assert.throws(() => createForm(null), /initialValues requires an object/)
  assert.throws(() => createForm({}, { validate: true }), /validate must be a function/)
  assert.throws(() => form.set('', 'bad'), /name must be a non-empty string/)
  assert.throws(() => form.subscribe(true), /requires a function/)
})

test('resources expose deterministic async state transitions and ignore late results', async () => {
  const resolvers = []
  const resource = createResource(() => new Promise(resolve => resolvers.push(resolve)))
  const seen = []
  resource.subscribe(state => seen.push(state.status))
  assert.equal(resource.state.status, 'idle')
  const first = resource.load()
  assert.equal(resource.state.status, 'loading')
  assert.equal(resource.load(), first)
  await Promise.resolve()
  resolvers.shift()('first')
  assert.equal(await first, 'first')
  assert.equal(resource.state.status, 'success')
  const second = resource.load()
  assert.equal(resource.state.status, 'stale')
  resource.invalidate()
  assert.equal(resource.state.status, 'stale')
  const third = resource.load()
  await Promise.resolve()
  resolvers.shift()('late')
  resolvers.shift()('fresh')
  assert.equal(await third, 'fresh')
  assert.equal(resource.state.data, 'fresh')
  assert.deepEqual(seen, ['loading', 'success', 'stale', 'stale', 'stale', 'success'])
})

test('resources represent errors, initial data, reset, and malformed subscriptions', async () => {
  const failure = new Error('offline')
  const resource = createResource(() => Promise.reject(failure), { initialData: 'cached' })
  assert.equal(resource.state.status, 'success')
  await assert.rejects(resource.load(), failure)
  assert.equal(resource.state.status, 'error')
  assert.equal(resource.state.data, 'cached')
  assert.equal(resource.state.error, failure)
  assert.equal(resource.reset().status, 'idle')
  assert.throws(() => resource.subscribe(true), /requires a function/)
  assert.throws(() => createResource(null), /requires a function/)
})

test('updateIn performs immutable structural-sharing updates', () => {
  const original = { user: { name: 'Ada', tags: ['admin', 'author'] }, untouched: { ok: true } }
  const next = updateIn(original, ['user', 'tags', 1], value => value.toUpperCase())
  assert.deepEqual(next, { user: { name: 'Ada', tags: ['admin', 'AUTHOR'] }, untouched: { ok: true } })
  assert.notEqual(next, original)
  assert.notEqual(next.user, original.user)
  assert.notEqual(next.user.tags, original.user.tags)
  assert.equal(next.untouched, original.untouched)
  assert.equal(Object.isFrozen(next), true)
  assert.equal(Object.isFrozen(next.user), true)
  assert.equal(Object.isFrozen(next.user.tags), true)
  assert.deepEqual(original.user.tags, ['admin', 'author'])
})

test('updateIn validates paths and updater functions', () => {
  assert.equal(updateIn(1, [], value => value + 1), 2)
  assert.throws(() => updateIn({}, ['missing'], value => value), /path does not exist/)
  assert.throws(() => updateIn({ value: 1 }, ['value'], null), /updater must be a function/)
  assert.throws(() => updateIn({ value: 1 }, 'value', value => value), /path must be an array/)
})

test('explicit stores provide shared immutable snapshots without a global registry', () => {
  const store = createStore({ count: 0, label: 'initial' })
  const seen = []
  const unsubscribe = store.subscribe(state => seen.push(state))
  assert.equal(store.state.count, 0)
  assert.equal(Object.isFrozen(store.state), true)
  const next = store.update(state => ({ count: state.count + 1 }))
  assert.deepEqual(next, { count: 1, label: 'initial' })
  assert.equal(seen.length, 1)
  assert.equal(seen[0], next)
  assert.equal(unsubscribe(), true)
  store.update({ label: 'changed' })
  assert.equal(seen.length, 1)
  store.reset()
  assert.deepEqual(store.state, { count: 0, label: 'initial' })
})

test('stores reject malformed updates and runtime exposes the explicit factory', () => {
  assert.throws(() => createStore(null), /requires an object/)
  const store = createStore({ count: 0 })
  assert.throws(() => store.update(null), /requires an object or updater function/)
  assert.throws(() => store.subscribe(true), /requires a function/)
  const source = clientRuntime()
  assert.match(source, /const createStore=/)
  assert.match(source, /window\.Ligature\.createStore=createStore/)
  assert.match(source, /const createOptimistic=/)
  assert.match(source, /window\.Ligature\.createOptimistic=createOptimistic/)
  assert.match(source, /const createResource=/)
  assert.match(source, /window\.Ligature\.createResource=createResource/)
  assert.match(source, /const createForm=/)
  assert.match(source, /window\.Ligature\.createForm=createForm/)
  assert.match(source, /const updateIn=/)
  assert.match(source, /window\.Ligature\.updateIn=updateIn/)
  assert.match(source, /const subscribers = new Set\(\)/)
})

test('controls distinguish controlled values from local defaults', () => {
  const changes = []
  const controlled = createControl({ value: 'server', defaultValue: 'fallback', onChange: value => changes.push(value) })
  assert.equal(controlled.controlled, true)
  assert.equal(controlled.value, 'server')
  controlled.set('user')
  assert.equal(controlled.value, 'server')
  assert.deepEqual(changes, ['user'])
  controlled.sync('next')
  assert.equal(controlled.value, 'next')
  controlled.reset()
  assert.deepEqual(changes, ['user', 'fallback'])
  const uncontrolled = createControl({ defaultValue: 0, onChange: value => changes.push(value) })
  assert.equal(uncontrolled.controlled, false)
  uncontrolled.set(1)
  assert.equal(uncontrolled.value, 1)
  uncontrolled.reset()
  assert.equal(uncontrolled.value, 0)
})

test('controls reject malformed options and runtime exposes the helper', () => {
  assert.throws(() => createControl(null), /requires an object/)
  assert.throws(() => createControl({ onChange: true }), /onChange must be a function/)
  const source = clientRuntime()
  assert.match(source, /const createControl=/)
  assert.match(source, /Ligature\.createControl=createControl/)
})

test('client runtime supports opt-in development diagnostics and production minification', () => {
  const development = clientRuntime({ development: true })
  assert.match(development, /runtimeDevelopment=true/)
  assert.match(development, /diagnostics:\{enabled:runtimeDevelopment,get\(\)/)
  assert.match(development, /runtimeDiagnostic\('error'/)
  const production = clientRuntime({ minified: true })
  assert.ok(production.length < clientRuntime().length)
  assert.doesNotThrow(() => new Function(production))
  assert.throws(() => clientRuntime({ development: 'yes' }), /must use boolean/)
})

test('client runtime exposes lifecycle and navigation APIs', () => {
  const source = clientRuntime()
  assert.match(source, /unmount/)
  assert.match(source, /navigate/)
  assert.match(source, /data-agent-outlet/)
})

test('client runtime supports keyed list reconciliation', () => {
  const source = clientRuntime()
  assert.match(source, /listState=new WeakMap\(\)/)
  assert.match(source, /function updateList\(root,items,options=\{\}\)/)
  assert.match(source, /Duplicate updateList key/)
  assert.match(source, /created\.dataset\.agentKey=key/)
  assert.match(source, /options\.update\?\.\(element,item,index\)/)
  assert.match(source, /unmount\(element\);element\.remove\(\)/)
  assert.match(source, /updateList,replace/)
})

test('partial replacement preserves form values, checked state, and focus', () => {
  const source = clientRuntime()
  assert.match(source, /function partialControls\(root\)/)
  assert.match(source, /agentField/)
  assert.match(source, /function capturePartialState\(root\)/)
  assert.match(source, /selectionStart/)
  assert.match(source, /function restorePartialState\(root,snapshot\)/)
  assert.match(source, /function replace\(root,next\)\{const snapshot=capturePartialState\(root\)/)
  assert.match(source, /restorePartialState\(outlet,snapshot\)/)
  assert.match(source, /el\.type==='file'/)
})

test('client runtime defines navigation lifecycle and scroll restoration', () => {
  const source = clientRuntime()
  assert.match(source, /navigationStateKey='__ligatureNavigation'/)
  assert.match(source, /history\.scrollRestoration='manual'/)
  assert.match(source, /ligature:navigation:'\+type/)
  assert.match(source, /dispatchNavigation\('end'/)
  assert.match(source, /dispatchNavigation\('error'/)
  assert.match(source, /Navigation cancelled/)
  assert.match(source, /history:'pop'/)
  assert.match(source, /restoreScroll\(\{x:0,y:0\}\)/)
})

test('client runtime observes dynamic component insertion and removal', () => {
  const source = clientRuntime()
  assert.match(source, /MutationObserver/)
  assert.match(source, /removedNodes/)
  assert.match(source, /addedNodes/)
  assert.match(source, /const removed=\[\],added=\[\]/)
  assert.match(source, /topLevel\(removed\)\.filter\(node=>!inRoot\(node\)\)/)
  assert.match(source, /topLevel\(added\)\.filter\(inRoot\)/)
  assert.match(source, /if\(!el\.isConnected\)\{delete el\.dataset\.agentHydrationQueued;return\}/)
  assert.match(source, /observe\(document\)/)
})

test('client runtime supports shared async loading with loading and error states', () => {
  const source = clientRuntime()
  assert.match(source, /const registry=new Map\(\),mounted=new Map\(\),refs=new Set\(\),refTargets=new Map\(\),loading=new Map\(\)/)
  assert.match(source, /function resolveAsync\(name,def\)/)
  assert.match(source, /setAsyncState\(el,def\.loading\)/)
  assert.match(source, /setAsyncState\(el,def\.error\)/)
  assert.match(source, /Async component loader must resolve to a definition object/)
})

test('client runtime defines parent-before-child mount and child-before-parent unmount order', () => {
  const source = clientRuntime()
  assert.match(source, /function componentElements\(root\)/)
  assert.match(source, /function scan\(root=document\)\{componentElements\(root\)\.forEach/)
  assert.match(source, /function unmount\(root=document\)\{componentElements\(root\)\.reverse\(\)\.forEach/)
})

test('client runtime makes lifecycle transitions transactional and cleanup resilient', () => {
  const source = clientRuntime()
  assert.match(source, /const item=\{name,instance,props,state,handle:handle===undefined\?null:Object\.freeze\(handle\),controller:new AbortController\(\)\};item\.lifecycle=lifecycleContext\(item\);mounted\.set\(el,item\);item\.element=el;item\.events=def\.events\|\|\{\};try\{def\.enhance\?\.\(el,state,item\.lifecycle\);def\.mount\?\./)
  assert.match(source, /function cleanupMounted\(el,item,def\)/)
  assert.match(source, /cleanupMounted\(el,item,def\);reportLifecycleError/)
  assert.match(source, /const nextProps=Object\.freeze\(\{\.\.\.item\.props,\.\.\.props\}\)/)
  assert.match(source, /def\.update\(element,nextProps,nextState,item\.lifecycle\)/)
  assert.match(source, /cleanupMounted\(el,item,registry\.get\(item\.name\)\)/)
})

test('client runtime defines isolated local state updates', () => {
  const source = clientRuntime()
  assert.match(source, /const setState=patch=>/)
  assert.match(source, /typeof patch==='function'\?patch\(item\.state\):patch/)
  assert.match(source, /Ligature setState requires an object or updater function/)
  assert.match(source, /const nextState=Object\.freeze\(\{\.\.\.item\.state,\.\.\.change\}\)/)
  assert.match(source, /setState,emit/)
  assert.match(source, /let state=Object\.freeze\(\{\.\.\.props,\.\.\.def\.state\?\.\(\)\}\)/)
})

test('client runtime provides instance-scoped derived state memoization', () => {
  const source = clientRuntime()
  assert.match(source, /const listeners=new Set\(\),cleanups=new Set\(\),derived=new Map\(\)/)
  assert.match(source, /const derive=\(key,compute,dependencies=\[\]\)=>/)
  assert.match(source, /Ligature derive dependencies must be an array/)
  assert.match(source, /previous\.dependencies\.every\(\(value,index\)=>Object\.is\(value,dependencies\[index\]\)\)/)
  assert.match(source, /derived\.set\(key,\{dependencies:\[\.\.\.dependencies\],value\}\)/)
  assert.match(source, /focus:focusElement,derive,setState,emit/)
  assert.match(source, /cleanups\.clear\(\);derived\.clear\(\)/)
})

test('client runtime scopes listeners and cancellation to each mounted instance', () => {
  const source = clientRuntime()
  assert.match(source, /controller:new AbortController\(\)/)
  assert.match(source, /function lifecycleContext\(item\)/)
  assert.match(source, /signal:item\.controller\.signal/)
  assert.match(source, /target\.addEventListener\(type,handler,options\)/)
  assert.match(source, /item\.controller\.abort\(\);item\.lifecycle\.cleanup\(\)/)
  assert.match(source, /def\.mount\?\.\(el,state,item\.lifecycle\)/)
  assert.match(source, /def\.update\(element,nextProps,nextState,item\.lifecycle\)/)
})

test('client runtime honors hydration markers and validates mount metadata', () => {
  const source = clientRuntime()
  assert.match(source, /el\.dataset\.agentHydrate!==\'true\'/)
  assert.match(source, /const name=el\.dataset\.agentComponent,instance=el\.dataset\.agentInstance/)
  assert.match(source, /Invalid Ligature mount marker/)
  assert.match(source, /function componentElements\(root\)/)
})

test('client runtime detects and reports server/client markup mismatches', () => {
  const source = clientRuntime()
  assert.match(source, /function markupSignature\(value\)/)
  assert.match(source, /agentMarkup/)
  assert.match(source, /MarkupMismatchError/)
  assert.match(source, /onMarkupMismatch/)
  assert.match(source, /agentMismatch='true'/)
})

test('client runtime supports scheduled and manual island hydration', () => {
  const source = clientRuntime()
  assert.match(source, /requestIdleCallback/)
  assert.match(source, /IntersectionObserver/)
  assert.match(source, /hydrate\(element\)/)
  assert.match(source, /hydrate\(element\) requires a manual hydration marker/)
  assert.match(source, /agentHydrationQueued/)
})

test('client runtime supports in-place progressive enhancement before mount', () => {
  const source = clientRuntime()
  assert.match(source, /def\.enhance\?\.\(el,state,item\.lifecycle\)/)
  assert.match(source, /mounted\.set\(el,item\);item\.element=el;item\.events=def\.events\|\|\{\};try\{def\.enhance\?\.\(el,state,item\.lifecycle\);def\.mount/s)
})

test('client runtime exposes scoped refs and imperative handles', () => {
  const source = clientRuntime()
  assert.match(source, /function createRef\(\)/)
  assert.match(source, /function attachRef\(ref,element\)/)
  assert.match(source, /def\.handle\?\.\(el,state\)/)
  assert.match(source, /Component handle must return an object/)
  assert.match(source, /releaseRefs\(el\)/)
  assert.match(source, /createRef,attachRef/)
})

test('client runtime routes mount and update failures to error boundaries', () => {
  const source = clientRuntime()
  assert.match(source, /function domLocation\(element\)/)
  assert.match(source, /name='LigatureRuntimeError'/)
  assert.match(source, /diagnostic\.component=component/)
  assert.match(source, /diagnostic\.location=domLocation\(element\)/)
  assert.match(source, /def\?\.onError\?\.\(diagnostic,element,state\)/)
  assert.match(source, /function findBoundary\(element\)/)
  assert.match(source, /def\.errorBoundary/)
  assert.match(source, /reportLifecycleError\(el,error,state,def,'mount'\)/)
  assert.match(source, /reportLifecycleError\(element,error,item\.state,def,'update'\)/)
  assert.match(source, /innerHTML=html/)
})

test('client runtime reports unmount failures with component and DOM location', () => {
  const source = clientRuntime()
  assert.match(source, /reportRuntimeError\(el,error,item\.state,def\|\|\{name:item\.name\},'unmount'\)/)
  assert.match(source, /console\.error\(diagnostic\)/)
})

test('client runtime provides delegated listeners and validated component events', () => {
  const source = clientRuntime()
  assert.match(source, /const delegate=\(target,type,selector,handler,options\)=>/)
  assert.match(source, /handler\(event,matched\)/)
  assert.match(source, /const emit=\(name,detail,options=\{\}\)=>/)
  assert.match(source, /Unknown component event/)
  assert.match(source, /new CustomEvent\(eventName,\{bubbles:options\.bubbles\?\?true,cancelable:options\.cancelable\?\?true,detail\}\)/)
})

test('client runtime provides focus and keyboard helpers', () => {
  const source = clientRuntime()
  assert.match(source, /function focusableElements\(root\)/)
  assert.match(source, /function focusFirst\(root,options=\{\}\)/)
  assert.match(source, /function listenKeys\(target,handlers,options=\{\}\)/)
  assert.match(source, /function trapFocus\(container,options=\{\}\)/)
  assert.match(source, /keys,focusFirst,focusTrap,focus:focusElement/)
  assert.match(source, /focus:focusElement,focusFirst,keys:listenKeys,trapFocus/)
})

test('resource cache invalidates and revalidates explicit named resources', async () => {
  let loads = 0
  const cache = createResourceCache()
  const resource = cache.resource('profile', () => ++loads)
  assert.equal(cache.resource('profile', () => 99), resource)
  assert.equal(await cache.revalidate('profile'), 1)
  cache.invalidate('profile')
  assert.equal(resource.state.status, 'stale')
  assert.equal(await cache.revalidate('profile'), 2)
})

test('state inspector observes explicitly tracked stores', () => {
  const store = createStore({ count: 0 })
  const inspector = createStateInspector()
  const seen = []
  inspector.subscribe(state => seen.push(state.app?.count))
  inspector.track('app', store)
  assert.equal(inspector.state.app.count, 0)
  store.update({ count: 1 })
  assert.deepEqual(seen, [0, 1])
  inspector.untrack('app')
  assert.equal(inspector.state.app, undefined)
})
