/** Create the client-side state boundary for controlled/uncontrolled values. */
export function createControl(options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('createControl(options) requires an object')
  if (options.onChange !== undefined && typeof options.onChange !== 'function') throw new TypeError('createControl(options).onChange must be a function')
  const controlled = Object.hasOwn(options, 'value')
  const defaultValue = options.defaultValue
  let externalValue = options.value
  let internalValue = controlled ? undefined : defaultValue
  const notify = value => options.onChange?.(value)
  const control = {
    get controlled() { return controlled },
    get value() { return controlled ? externalValue : internalValue },
    set(value) { if (controlled) notify(value); else { internalValue = value; notify(value) }; return value },
    sync(value) { if (controlled) externalValue = value; return control.value },
    reset() { return control.set(defaultValue) }
  }
  return Object.freeze(control)
}

/** Create an explicit shared state store; no module-global registry is used. */
export function createStore(initialState = {}) {
  if (!initialState || typeof initialState !== 'object' || Array.isArray(initialState)) throw new TypeError('createStore(initialState) requires an object')
  let current = Object.freeze({ ...initialState })
  const subscribers = new Set()
  const store = {
    get state() { return current },
    update(patch) {
      const change = typeof patch === 'function' ? patch(current) : patch
      if (!change || typeof change !== 'object' || Array.isArray(change)) throw new TypeError('store.update requires an object or updater function')
      current = Object.freeze({ ...current, ...change })
      subscribers.forEach(listener => listener(current))
      return current
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('store.subscribe requires a function')
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    },
    reset() {
      current = Object.freeze({ ...initialState })
      subscribers.forEach(listener => listener(current))
      return current
    }
  }
  return Object.freeze(store)
}

/** Apply a client update immediately and restore the previous snapshot on failure. */
export function createOptimistic(initialState) {
  let current = Object.freeze({ data: initialState, pending: false, error: null })
  let active = false
  const subscribers = new Set()
  const publish = next => {
    current = Object.freeze({ data: next.data, pending: Boolean(next.pending), error: next.error ?? null })
    subscribers.forEach(listener => listener(current))
    return current
  }
  const optimistic = (update, mutation) => {
    if (typeof update !== 'function') throw new TypeError('optimistic.update must be a function')
    if (typeof mutation !== 'function') throw new TypeError('optimistic.mutation must be a function')
    if (active) throw new Error('Optimistic updates cannot overlap')
    active = true
    const previous = current.data
    let next
    try { next = update(previous) } catch (error) { active = false; throw error }
    publish({ data: next, pending: true, error: null })
    return Promise.resolve().then(() => mutation(next)).then(committed => {
      publish({ data: committed === undefined ? next : committed, pending: false, error: null })
      return current.data
    }, error => {
      publish({ data: previous, pending: false, error })
      throw error
    }).finally(() => { active = false })
  }
  const rollback = error => publish({ data: current.data, pending: false, error: error ?? new Error('Optimistic update rolled back') })
  const optimisticState = {
    get state() { return current },
    update: optimistic,
    rollback,
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('optimistic.subscribe requires a function')
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    }
  }
  return Object.freeze(optimisticState)
}

/** Track one async value with explicit idle/loading/success/error/stale states. */
export function createResource(loader, options = {}) {
  if (typeof loader !== 'function') throw new TypeError('createResource(loader) requires a function')
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('createResource options must be an object')
  const hasInitialData = Object.hasOwn(options, 'initialData')
  let current = Object.freeze({ status: hasInitialData ? 'success' : 'idle', data: hasInitialData ? options.initialData : undefined, error: null })
  let pending = null
  let generation = 0
  const subscribers = new Set()
  const publish = next => {
    current = Object.freeze({ status: next.status, data: next.data, error: next.error ?? null })
    subscribers.forEach(listener => listener(current))
    return current
  }
  const load = () => {
    if (pending) return pending
    const requestGeneration = ++generation
    const hasData = current.data !== undefined
    publish({ status: hasData ? 'stale' : 'loading', data: current.data, error: null })
    pending = Promise.resolve().then(() => loader()).then(data => {
      if (requestGeneration === generation) publish({ status: 'success', data, error: null })
      return data
    }, error => {
      if (requestGeneration === generation) publish({ status: 'error', data: current.data, error })
      throw error
    }).finally(() => {
      if (requestGeneration === generation) pending = null
    })
    return pending
  }
  const resource = {
    get state() { return current },
    load,
    invalidate() {
      generation += 1
      pending = null
      return publish({ status: current.data === undefined ? 'idle' : 'stale', data: current.data, error: null })
    },
    reset() {
      generation += 1
      pending = null
      return publish({ status: 'idle', data: undefined, error: null })
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('resource.subscribe requires a function')
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    }
  }
  return Object.freeze(resource)
}

/** Coordinate named resources without introducing a framework-global cache. */
export function createResourceCache() {
  const resources = new Map()
  const cache = {
    resource(key, loader, options = {}) {
      if (typeof key !== 'string' || !key) throw new TypeError('resource key must be a non-empty string')
      if (resources.has(key)) return resources.get(key)
      const resource = createResource(loader, options)
      resources.set(key, resource)
      return resource
    },
    get(key) { return resources.get(key) },
    invalidate(key) {
      if (key === undefined) { resources.forEach(resource => resource.invalidate()); return cache }
      resources.get(key)?.invalidate()
      return cache
    },
    async revalidate(key) {
      if (key === undefined) return Promise.all([...resources.values()].map(resource => resource.load()))
      const resource = resources.get(key)
      if (!resource) throw new Error(`Unknown resource key: ${key}`)
      return resource.load()
    }
  }
  return Object.freeze(cache)
}

/** Expose explicit, subscription-based state inspection for devtools or tests. */
export function createStateInspector() {
  const sources = new Map(), listeners = new Set()
  const snapshot = () => Object.freeze(Object.fromEntries([...sources].map(([name, source]) => [name, source.source.state])))
  const inspector = {
    track(name, source) {
      if (typeof name !== 'string' || !name) throw new TypeError('inspector.track name must be a non-empty string')
      if (!source || typeof source.subscribe !== 'function' || !('state' in source)) throw new TypeError('inspector.track source must expose state and subscribe')
      inspector.untrack(name)
      const unsubscribe = source.subscribe(() => listeners.forEach(listener => listener(snapshot())))
      sources.set(name, { source, unsubscribe })
      listeners.forEach(listener => listener(snapshot()))
      return () => inspector.untrack(name)
    },
    untrack(name) { const source = sources.get(name); if (source) { source.unsubscribe(); sources.delete(name); listeners.forEach(listener => listener(snapshot())) }; return inspector },
    get state() { return snapshot() },
    subscribe(listener) { if (typeof listener !== 'function') throw new TypeError('inspector.subscribe requires a function'); listeners.add(listener); return () => listeners.delete(listener) }
  }
  return Object.freeze(inspector)
}

/** Track form values, validation, submission, and reset without owning transport. */
export function createForm(initialValues = {}, options = {}) {
  if (!initialValues || typeof initialValues !== 'object' || Array.isArray(initialValues)) throw new TypeError('createForm initialValues requires an object')
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('createForm options must be an object')
  if (options.validate !== undefined && typeof options.validate !== 'function') throw new TypeError('createForm validate must be a function')
  if (options.onSubmit !== undefined && typeof options.onSubmit !== 'function') throw new TypeError('createForm onSubmit must be a function')
  const original = Object.freeze({ ...initialValues })
  const subscribers = new Set()
  let current
  const freezeMap = value => Object.freeze({ ...(value || {}) })
  const publish = patch => {
    current = Object.freeze({
      values: Object.freeze({ ...current.values, ...(patch.values || {}) }),
      initialValues: current.initialValues,
      touched: freezeMap(patch.touched === undefined ? current.touched : patch.touched),
      errors: freezeMap(patch.errors === undefined ? current.errors : patch.errors),
      dirty: patch.dirty === undefined ? current.dirty : patch.dirty,
      submitting: patch.submitting === undefined ? current.submitting : patch.submitting,
      submitted: patch.submitted === undefined ? current.submitted : patch.submitted
    })
    subscribers.forEach(listener => listener(current))
    return current
  }
  const runValidation = values => {
    if (!options.validate) return {}
    const result = options.validate(Object.freeze({ ...values }))
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new TypeError('createForm validate must return an errors object')
    return result
  }
  const isDirty = values => Object.keys(original).some(key => !Object.is(values[key], original[key])) || Object.keys(values).some(key => !Object.hasOwn(original, key))
  current = Object.freeze({ values: original, initialValues: original, touched: Object.freeze({}), errors: Object.freeze({}), dirty: false, submitting: false, submitted: false })
  const form = {
    get state() { return current },
    set(name, value) {
      if (typeof name !== 'string' || !name) throw new TypeError('form.set name must be a non-empty string')
      const values = { ...current.values, [name]: value }
      return publish({ values, dirty: isDirty(values), submitted: false })
    },
    touch(name, touched = true) {
      if (typeof name !== 'string' || !name) throw new TypeError('form.touch name must be a non-empty string')
      return publish({ touched: { ...current.touched, [name]: Boolean(touched) } })
    },
    validate() {
      const errors = runValidation(current.values)
      return publish({ errors }).errors
    },
    async submit() {
      const errors = runValidation(current.values)
      if (Object.keys(errors).length) { publish({ errors, submitted: false }); return false }
      publish({ errors: {}, submitting: true })
      try {
        await options.onSubmit?.(Object.freeze({ ...current.values }))
        publish({ submitting: false, submitted: true })
        return true
      } catch (error) {
        publish({ submitting: false, errors: { _form: error }, submitted: false })
        throw error
      }
    },
    reset(values = original) {
      if (!values || typeof values !== 'object' || Array.isArray(values)) throw new TypeError('form.reset values requires an object')
      const next = Object.freeze({ ...values })
      current = Object.freeze({ values: next, initialValues: next, touched: Object.freeze({}), errors: Object.freeze({}), dirty: false, submitting: false, submitted: false })
      subscribers.forEach(listener => listener(current))
      return current
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('form.subscribe requires a function')
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    }
  }
  return Object.freeze(form)
}

/** Update one existing nested value without mutating any traversed object or array. */
export function updateIn(value, path, updater) {
  if (!Array.isArray(path)) throw new TypeError('updateIn path must be an array')
  if (typeof updater !== 'function') throw new TypeError('updateIn updater must be a function')
  if (path.length === 0) return updater(value)
  const walk = (current, index) => {
    const key = path[index]
    if ((typeof key !== 'string' && !Number.isInteger(key)) || key === '') throw new TypeError('updateIn path segments must be non-empty strings or integers')
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, key)) throw new TypeError('updateIn path does not exist')
    const next = index === path.length - 1 ? updater(current[key]) : walk(current[key], index + 1)
    const copy = Array.isArray(current) ? current.slice() : { ...current }
    copy[key] = next
    return Object.freeze(copy)
  }
  return walk(value, 0)
}

function minifyRuntimeSource(source) {
  // Preserve line breaks because the embedded createControl function relies on
  // automatic semicolon insertion. Removing indentation and horizontal runs
  // is safe and still gives a deterministic production artifact.
  return source.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim()
}

export function clientRuntime({ development = false, minified = false } = {}) {
  if (typeof development !== 'boolean' || typeof minified !== 'boolean') throw new TypeError('clientRuntime options must use boolean development and minified values')
  const source = `(function(){
const runtimeDevelopment=${development},runtimeDiagnostics=[];
function runtimeDiagnostic(type,detail={}){if(!runtimeDevelopment)return;const entry=Object.freeze({type,time:Date.now(),...detail});runtimeDiagnostics.push(entry);if(runtimeDiagnostics.length>100)runtimeDiagnostics.shift();window.Ligature?.onDiagnostic?.(entry)}
const registry=new Map(),mounted=new Map(),refs=new Set(),refTargets=new Map(),loading=new Map(),listState=new WeakMap();
const navigationStateKey='__ligatureNavigation';
const createControl=${createControl.toString()};
const createStore=${createStore.toString()};
const createOptimistic=${createOptimistic.toString()};
const createResource=${createResource.toString()};
const createResourceCache=${createResourceCache.toString()};
const createStateInspector=${createStateInspector.toString()};
const createForm=${createForm.toString()};
const updateIn=${updateIn.toString()};
function markupSignature(value){let hash=2166136261;for(let index=0;index<value.length;index+=1){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(16).padStart(8,'0')}
function componentElements(root){return root.matches?.('[data-agent-component]')?[root,...root.querySelectorAll('[data-agent-component]')]:[...root.querySelectorAll('[data-agent-component]')]}
function createRef(){const ref={current:null};refs.add(ref);return ref}
function attachRef(ref,element){if(!refs.has(ref))throw new Error('Invalid Ligature ref');if(element==null){ref.current=null;refTargets.delete(ref);return ref}const item=mounted.get(element);if(!item)throw new Error('Cannot attach ref to an unmounted component');ref.current=item.handle??element;refTargets.set(ref,element);return ref}
function releaseRefs(element){refs.forEach(ref=>{if(refTargets.get(ref)===element){ref.current=null;refTargets.delete(ref)}})}
function domLocation(element){const parts=[];for(let current=element;current?.nodeType===1;current=current.parentElement){if(current.id){parts.unshift('#'+current.id);break}let index=1;for(let sibling=current.previousElementSibling;sibling;sibling=sibling.previousElementSibling)if(sibling.localName===current.localName)index++;parts.unshift(current.localName+':nth-of-type('+index+')')}return parts.join(' > ')||'<unknown>'}
function findBoundary(element){for(let current=element;current;current=current.parentElement){const item=mounted.get(current),def=item&&registry.get(item.name);if(def?.errorBoundary)return {element:current,state:item.state,def}}return null}
function runtimeError(element,error,def,phase){const component=def?.name||element.dataset.agentComponent||'<unknown>';const original=error instanceof Error?error:new Error(String(error));const diagnostic=new Error('Component '+component+' '+phase+' failed at '+domLocation(element)+': '+original.message,{cause:original});diagnostic.name='LigatureRuntimeError';diagnostic.component=component;diagnostic.location=domLocation(element);diagnostic.phase=phase;runtimeDiagnostic('error',{component,phase,location:diagnostic.location});return diagnostic}
function reportRuntimeError(element,error,state,def,phase){const diagnostic=runtimeError(element,error,def,phase);def?.onError?.(diagnostic,element,state);return diagnostic}
function reportLifecycleError(element,error,state,def,phase='lifecycle'){const diagnostic=reportRuntimeError(element,error,state,def,phase);const boundary=findBoundary(element)||(def?.errorBoundary?{element,state,def}:null);if(!boundary)throw diagnostic;const html=boundary.def.errorBoundary(diagnostic,boundary.element,boundary.state);if(typeof html!=='string')throw new TypeError('Component errorBoundary must return an HTML string');boundary.element.innerHTML=html}
function reportMarkupMismatch(element,expected,actual,state,def){const error=new Error('Server/client markup mismatch for '+def.name+' ('+actual+' !== '+expected+')');error.name='MarkupMismatchError';error.component=def.name;error.expected=expected;error.actual=actual;element.dataset.agentMismatch='true';runtimeDiagnostic('markup-mismatch',{component:def.name,expected,actual,location:domLocation(element)});if(def.onMarkupMismatch)def.onMarkupMismatch(error,element,state);else console.error(error)}
function setAsyncState(el,html){if(html!==undefined){if(typeof html!=='string')throw new TypeError('Async component state must be an HTML string');el.innerHTML=html}}
function partialControls(root){const own=root.matches?.('input,textarea,select,[contenteditable="true"]')?[root]:[];return own.concat([...root.querySelectorAll('input,textarea,select,[contenteditable="true"]')])}
function partialKey(el,index){return el.dataset.agentField||el.id||el.name||'index:'+index}
function capturePartialState(root){const controls=partialControls(root),values=controls.map((el,index)=>({key:partialKey(el,index),value:el.value,checked:el.checked,content:el.isContentEditable?el.innerHTML:undefined,type:el.type}));const active=document.activeElement,activeIndex=controls.indexOf(active);return {values,focus:activeIndex<0?null:{key:partialKey(active,activeIndex),selectionStart:active.selectionStart,selectionEnd:active.selectionEnd}}}
function restorePartialState(root,snapshot){if(!snapshot)return;const controls=partialControls(root),byKey=new Map();controls.forEach((el,index)=>{const key=partialKey(el,index);if(!byKey.has(key))byKey.set(key,el)});snapshot.values.forEach(saved=>{const el=byKey.get(saved.key);if(!el||el.disabled||el.type==='file')return;if(el.isContentEditable)el.innerHTML=saved.content;else if(el.type==='checkbox'||el.type==='radio')el.checked=saved.checked;else el.value=saved.value});if(snapshot.focus){const el=byKey.get(snapshot.focus.key);if(el){el.focus();if(typeof snapshot.focus.selectionStart==='number'&&typeof el.setSelectionRange==='function')el.setSelectionRange(snapshot.focus.selectionStart,snapshot.focus.selectionEnd)}}}
function focusableElements(root){const selector='a[href],area[href],button,input,select,textarea,[contenteditable="true"],[tabindex]:not([tabindex="-1"])';const own=root.matches?.(selector)?[root]:[];return own.concat([...root.querySelectorAll(selector)]).filter(el=>!el.disabled&&!el.hidden&&el.getAttribute('aria-hidden')!=='true'&&el.getClientRects().length>0)}
function focusElement(element,options={}){if(!element||typeof element.focus!=='function'||!element.isConnected)return false;element.focus({preventScroll:options.preventScroll===true});return document.activeElement===element}
function focusFirst(root,options={}){if(!root||typeof root.querySelectorAll!=='function')throw new TypeError('Ligature.focusFirst root must be an Element');const element=focusableElements(root)[0];return element&&focusElement(element,options)?element:null}
function listenKeys(target,handlers,options={}){if(!target||typeof target.addEventListener!=='function')throw new TypeError('Ligature.keys target must support addEventListener');if(!handlers||typeof handlers!=='object'||Array.isArray(handlers))throw new TypeError('Ligature.keys handlers must be an object');const listener=event=>{const handler=handlers[event.key]||handlers['*'];if(typeof handler!=='function')return;const result=handler(event);if(result===false)event.preventDefault()};target.addEventListener('keydown',listener,options);return()=>target.removeEventListener('keydown',listener,options)}
function trapFocus(container,options={}){if(!container||typeof container.addEventListener!=='function')throw new TypeError('Ligature.trapFocus container must support addEventListener');if(options.onEscape!==undefined&&typeof options.onEscape!=='function')throw new TypeError('Ligature.trapFocus onEscape must be a function');const listener=event=>{if(event.key==='Escape'&&options.onEscape){options.onEscape(event);return}if(event.key!=='Tab')return;const elements=focusableElements(container);if(!elements.length)return;const first=elements[0],last=elements[elements.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();focusElement(last,{preventScroll:true})}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();focusElement(first,{preventScroll:true})}};container.addEventListener('keydown',listener);if(options.initialFocus!==false)focusFirst(container,{preventScroll:true});return()=>container.removeEventListener('keydown',listener)}
function resolveAsync(name,def){if(!loading.has(name)){loading.set(name,Promise.resolve().then(()=>def.load()).then(loaded=>{if(!loaded||typeof loaded!=='object')throw new TypeError('Async component loader must resolve to a definition object');const resolved={...def,...loaded};delete resolved.load;registry.set(name,resolved);return resolved}))}return loading.get(name)}
function lifecycleContext(item){const listeners=new Set(),cleanups=new Set(),derived=new Map();const listen=(target,type,handler,options)=>{if(!target||typeof target.addEventListener!=='function')throw new TypeError('Ligature listen target must support addEventListener');target.addEventListener(type,handler,options);const registration={target,type,handler,options};listeners.add(registration);return()=>{if(!listeners.delete(registration))return;target.removeEventListener(type,handler,options)};};const delegate=(target,type,selector,handler,options)=>{if(typeof selector!=='string'||!selector)throw new TypeError('Ligature delegate selector must be a non-empty string');if(typeof handler!=='function')throw new TypeError('Ligature delegate handler must be a function');const delegated=event=>{const origin=event.target?.nodeType===1?event.target:event.target?.parentElement,matched=origin?.closest?.(selector);if(!matched||(target!==matched&&!target.contains(matched)))return;handler(event,matched)};return listen(target,type,delegated,options)};const keys=(target,handlers,options)=>{const cleanup=listenKeys(target,handlers,options);cleanups.add(cleanup);return()=>{if(!cleanups.delete(cleanup))return;cleanup()}};const focusTrap=(container,options)=>{const cleanup=trapFocus(container,options);cleanups.add(cleanup);return()=>{if(!cleanups.delete(cleanup))return;cleanup()}};const derive=(key,compute,dependencies=[])=>{if(typeof key!=='string'||!key)throw new TypeError('Ligature derive key must be a non-empty string');if(typeof compute!=='function')throw new TypeError('Ligature derive compute must be a function');if(!Array.isArray(dependencies))throw new TypeError('Ligature derive dependencies must be an array');const previous=derived.get(key);if(previous&&previous.dependencies.length===dependencies.length&&previous.dependencies.every((value,index)=>Object.is(value,dependencies[index])))return previous.value;const value=compute();derived.set(key,{dependencies:[...dependencies],value});return value};const setState=patch=>{const change=typeof patch==='function'?patch(item.state):patch;if(!change||typeof change!=='object'||Array.isArray(change))throw new TypeError('Ligature setState requires an object or updater function');const nextState=Object.freeze({...item.state,...change});const def=registry.get(item.name);if(typeof def?.update!=='function')throw new Error('Component does not implement update');try{def.update(item.element,item.props,nextState,item.lifecycle)}catch(error){reportLifecycleError(item.element,error,nextState,def,'update');return item.state}item.state=nextState;return nextState};const emit=(name,detail,options={})=>{const eventName=item.events?.[name];if(typeof eventName!=='string'||!eventName)throw new Error('Unknown component event: '+name);return item.element.dispatchEvent(new CustomEvent(eventName,{bubbles:options.bubbles??true,cancelable:options.cancelable??true,detail}))};return {signal:item.controller.signal,listen,delegate,keys,focusFirst,focusTrap,focus:focusElement,derive,setState,emit,cleanup(){for(const registration of listeners){registration.target.removeEventListener(registration.type,registration.handler,registration.options)}listeners.clear();for(const cleanup of cleanups)cleanup();cleanups.clear();derived.clear()}}}
function cleanupMounted(el,item,def){if(!mounted.has(el))return;mounted.delete(el);releaseRefs(el);item.controller.abort();item.lifecycle.cleanup();try{def?.unmount?.(el,item.state,item.lifecycle)}catch(error){const diagnostic=reportRuntimeError(el,error,item.state,def||{name:item.name},'unmount');console.error(diagnostic)}}
function hydrateElement(el){if(!el.isConnected){delete el.dataset.agentHydrationQueued;return}const name=el.dataset.agentComponent,instance=el.dataset.agentInstance,def=registry.get(name);if(!name||!instance)throw new Error('Invalid Ligature mount marker');if(!def)throw new Error('Component asset not registered: '+name);if(typeof def.load==='function'){setAsyncState(el,def.loading);resolveAsync(name,def).then(()=>hydrateElement(el),error=>{setAsyncState(el,def.error);if(def.error===undefined)reportLifecycleError(el,error,{},def,'load')});return}let props={};try{props=JSON.parse(el.dataset.agentProps||'{}')}catch{};let state=Object.freeze({...props,...def.state?.()});if(typeof def.render==='function'&&el.dataset.agentMarkup){const actual=markupSignature(def.render(props,state));if(actual!==el.dataset.agentMarkup)reportMarkupMismatch(el,el.dataset.agentMarkup,actual,state,def)}const handle=def.handle?.(el,state);if(handle!==undefined&&(handle===null||typeof handle!=='object'))throw new Error('Component handle must return an object');const item={name,instance,props,state,handle:handle===undefined?null:Object.freeze(handle),controller:new AbortController()};item.lifecycle=lifecycleContext(item);mounted.set(el,item);item.element=el;item.events=def.events||{};try{def.enhance?.(el,state,item.lifecycle);def.mount?.(el,state,item.lifecycle)}catch(error){cleanupMounted(el,item,def);reportLifecycleError(el,error,state,def,'mount')}}
function scheduleHydration(el){const mode=el.dataset.agentHydrate;if(mode==='manual'||el.dataset.agentHydrationQueued)return;if(mode==='idle'){el.dataset.agentHydrationQueued='true';(window.requestIdleCallback||window.setTimeout)(()=>hydrateElement(el),mode==='idle'?{timeout:2000}:0);return}if(mode==='visible'){el.dataset.agentHydrationQueued='true';if(!window.IntersectionObserver){hydrateElement(el);return}const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){observer.disconnect();hydrateElement(el)}}));observer.observe(el);return}hydrateElement(el)}
function scan(root=document){componentElements(root).forEach(el=>{if(mounted.has(el)||el.dataset.agentHydrate!=='true'&&!['eager','true','idle','visible','manual'].includes(el.dataset.agentHydrate)||el.dataset.agentHydrate==='false')return;if(el.dataset.agentHydrate==='manual')return;scheduleHydration(el)})}
function unmount(root=document){componentElements(root).reverse().forEach(el=>{const item=mounted.get(el);if(!item)return;cleanupMounted(el,item,registry.get(item.name))})}
function updateList(root,items,options={}){if(!root||typeof root.append!=='function')throw new TypeError('updateList root must be an Element');if(!Array.isArray(items))throw new TypeError('updateList items must be an array');if(!options||typeof options!=='object'||typeof options.key!=='function'||typeof options.render!=='function')throw new TypeError('updateList requires key and render functions');if(options.update!==undefined&&typeof options.update!=='function')throw new TypeError('updateList update must be a function');const previous=listState.get(root)||new Map([...root.children].filter(el=>el.dataset.agentKey!==undefined).map(el=>[el.dataset.agentKey,el]));const next=new Map(),ordered=[];items.forEach((item,index)=>{const value=options.key(item,index),key=typeof value==='string'||typeof value==='number'?String(value):null;if(key===null)throw new TypeError('updateList keys must be strings or numbers');if(next.has(key))throw new Error('Duplicate updateList key: '+key);const element=previous.get(key);if(element){options.update?.(element,item,index);ordered.push(element)}else{const created=options.render(item,index);if(!created||created.nodeType!==1)throw new TypeError('updateList render must return an Element');created.dataset.agentKey=key;ordered.push(created)}next.set(key,ordered[ordered.length-1])});previous.forEach((element,key)=>{if(!next.has(key)){unmount(element);element.remove()}});const fragment=document.createDocumentFragment();ordered.forEach(element=>fragment.append(element));root.append(fragment);listState.set(root,next);scan(root);return root}
function observe(root=document){if(!window.MutationObserver)return null;const observer=new MutationObserver(records=>{const removed=[],added=[];records.forEach(record=>{record.removedNodes.forEach(node=>{if(node.nodeType===1)removed.push(node)});record.addedNodes.forEach(node=>{if(node.nodeType===1)added.push(node)})});const inRoot=node=>root===document?node.isConnected:root.contains(node);const topLevel=nodes=>nodes.filter(node=>!nodes.some(other=>other!==node&&other.contains(node)));topLevel(removed).filter(node=>!inRoot(node)).forEach(node=>unmount(node));topLevel(added).filter(inRoot).forEach(node=>scan(node))});observer.observe(root,{childList:true,subtree:true});return observer}
function currentScroll(){return {x:window.scrollX||window.pageXOffset||0,y:window.scrollY||window.pageYOffset||0}}
function historyState(scroll){return {...(history.state||{}),[navigationStateKey]:{scroll:{x:Number(scroll?.x)||0,y:Number(scroll?.y)||0}}}}
function rememberScroll(){history.replaceState(historyState(currentScroll()),'',location.href)}
function dispatchNavigation(type,detail,cancelable=false){return document.dispatchEvent(new CustomEvent('ligature:navigation:'+type,{bubbles:false,cancelable,detail}))}
function restoreScroll(scroll){const position=scroll||{x:0,y:0};window.scrollTo(position.x,position.y)}
function replace(root,next){const snapshot=capturePartialState(root);unmount(root);root.replaceWith(next);restorePartialState(next,snapshot);scan(next)}
function navigate(url,target=document.querySelector('[data-agent-outlet]'),options={}){if(!target)return Promise.reject(new Error('Missing data-agent-outlet'));if(!options||typeof options!=='object')return Promise.reject(new TypeError('Navigation options must be an object'));const mode=options.history||'push',destination=new URL(url,location.href).href;const detail={url:destination,target,mode};if(!dispatchNavigation('start',detail,true))return Promise.reject(new Error('Navigation cancelled'));const snapshot=capturePartialState(target);return fetch(destination,{headers:{'X-Ligature-Navigation':'1'}}).then(response=>{if(!response.ok)throw new Error('Navigation failed: '+response.status);return response.text()}).then(html=>{const parsed=new DOMParser().parseFromString(html,'text/html'),outlet=parsed.querySelector('[data-agent-outlet]');if(!outlet)throw new Error('Response missing data-agent-outlet');unmount(target);target.replaceWith(outlet);restorePartialState(outlet,snapshot);scan(outlet);if(mode==='push'){rememberScroll();history.pushState(historyState({x:0,y:0}),'',destination);restoreScroll({x:0,y:0})}else if(mode==='replace'){history.replaceState(historyState(options.scroll||{x:0,y:0}),'',destination);restoreScroll(options.scroll)}else if(mode==='pop'){restoreScroll(options.scroll||history.state?.[navigationStateKey]?.scroll)}dispatchNavigation('end',{...detail,scroll:currentScroll()});return outlet}).catch(error=>{dispatchNavigation('error',{...detail,error});throw error})}
window.Ligature={register(name,definition){registry.set(name,definition);scan(document)},mount:scan,hydrate(element){if(!element||element.dataset.agentHydrate!=='manual')throw new Error('hydrate(element) requires a manual hydration marker');hydrateElement(element)},unmount,observe,createRef,attachRef,focus:focusElement,focusFirst,keys:listenKeys,trapFocus,diagnostics:{enabled:runtimeDevelopment,get(){return runtimeDiagnostics.slice()},clear(){runtimeDiagnostics.length=0}},update(element,props={}){const item=mounted.get(element);if(!item)throw new Error('Component is not mounted');const def=registry.get(item.name);if(!def.update)throw new Error('Component does not implement update');const nextProps=Object.freeze({...item.props,...props}),nextState=Object.freeze({...item.state,...nextProps});try{def.update(element,nextProps,nextState,item.lifecycle)}catch(error){reportLifecycleError(element,error,item.state,def,'update');return}item.props=nextProps;item.state=nextState;element.dataset.agentProps=JSON.stringify(nextProps)},updateList,replace,navigate};
window.Ligature.createControl=createControl;window.Ligature.createStore=createStore;window.Ligature.createOptimistic=createOptimistic;window.Ligature.createResource=createResource;window.Ligature.createResourceCache=createResourceCache;window.Ligature.createStateInspector=createStateInspector;window.Ligature.createForm=createForm;window.Ligature.updateIn=updateIn;
document.addEventListener('DOMContentLoaded',()=>{try{history.scrollRestoration='manual'}catch{};rememberScroll();scan();observe(document)});
window.addEventListener('popstate',event=>{const scroll=event.state?.[navigationStateKey]?.scroll;window.Ligature.navigate(location.href,undefined,{history:'pop',scroll}).catch(console.error)});
})();`
  return minified ? minifyRuntimeSource(source) : source
}

export function componentClientSource(component) {
  const client = component.client || '{}'
  return `(function(){if(!window.Ligature)throw new Error('Ligature runtime missing');const definition=Object.assign({},${client},{events:${JSON.stringify(component.events || {})}});window.Ligature.register(${JSON.stringify(component.name)},definition)})()`
}
