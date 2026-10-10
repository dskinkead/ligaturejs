const idPattern = /^[A-Za-z][A-Za-z0-9_.:-]*$/

function record(value, name) {
  if (value === undefined) return {}
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`)
  return value
}

function id(value, name) {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !idPattern.test(value)) throw new TypeError(`${name} must be a valid HTML id`)
  return value
}

function attrs(values) {
  return Object.freeze(Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)))
}

/** Return the WAI-ARIA contract for a modal or non-modal dialog. */
export function dialogProps(options = {}) {
  const value = record(options, 'dialog options')
  const labelledBy = id(value.labelledBy, 'dialog labelledBy')
  const describedBy = id(value.describedBy, 'dialog describedBy')
  return attrs({ role: 'dialog', 'aria-modal': value.modal === false ? 'false' : 'true', 'aria-labelledby': labelledBy, 'aria-describedby': describedBy })
}

/** Return menu container attributes. Menu items must be rendered with menuItemProps. */
export function menuProps(options = {}) {
  const value = record(options, 'menu options')
  return attrs({ role: 'menu', 'aria-label': typeof value.label === 'string' ? value.label : undefined, 'aria-labelledby': id(value.labelledBy, 'menu labelledBy') })
}

export function menuItemProps(options = {}) {
  const value = record(options, 'menu item options')
  if (value.disabled !== undefined && typeof value.disabled !== 'boolean') throw new TypeError('menu item disabled must be boolean')
  return attrs({ role: 'menuitem', tabindex: value.disabled ? '-1' : '0', 'aria-disabled': value.disabled ? 'true' : undefined })
}

/** Return the linked tab/tablist/tabpanel attributes for one tab. */
export function tabsProps(options = {}) {
  const value = record(options, 'tabs options')
  const tabId = id(value.tabId, 'tabs tabId')
  const panelId = id(value.panelId, 'tabs panelId')
  if (!tabId || !panelId) throw new TypeError('tabs requires tabId and panelId')
  const selected = value.selected === true
  return Object.freeze({
    tablist: attrs({ role: 'tablist', 'aria-label': value.label }),
    tab: attrs({ id: tabId, role: 'tab', 'aria-selected': selected ? 'true' : 'false', 'aria-controls': panelId, tabindex: selected ? '0' : '-1' }),
    panel: attrs({ id: panelId, role: 'tabpanel', 'aria-labelledby': tabId, tabindex: '0', hidden: selected ? undefined : true })
  })
}

/** Return a stable label/description/error association for a form control. */
export function fieldProps(options = {}) {
  const value = record(options, 'field options')
  const fieldId = id(value.id, 'field id')
  if (!fieldId) throw new TypeError('field requires id')
  if (value.invalid !== undefined && typeof value.invalid !== 'boolean') throw new TypeError('field invalid must be boolean')
  const described = [value.describedBy, value.errorId].map((entry, index) => id(entry, index ? 'field errorId' : 'field describedBy')).filter(Boolean).join(' ') || undefined
  return attrs({ id: fieldId, 'aria-describedby': described, 'aria-invalid': value.invalid ? 'true' : undefined, 'aria-required': value.required ? 'true' : undefined })
}

/** Return live-region attributes for status, alert, and notification content. */
export function notificationProps(options = {}) {
  const value = record(options, 'notification options')
  const role = value.urgent === true ? 'alert' : 'status'
  return attrs({ role, 'aria-live': value.urgent === true ? 'assertive' : 'polite', 'aria-atomic': 'true' })
}

/** CSS baseline that keeps focus visible without imposing a visual theme. */
export function focusVisibleCss() {
  return ':where(:focus-visible){outline:3px solid currentColor;outline-offset:3px}:where([data-focus-scope]) :focus:not(:focus-visible){outline:0}'
}
