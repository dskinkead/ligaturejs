import test from 'node:test'
import assert from 'node:assert/strict'
import { dialogProps, menuProps, menuItemProps, tabsProps, fieldProps, notificationProps, focusVisibleCss } from '../src/index.js'

test('accessibility primitives emit complete dialog, menu, and tab relationships', () => {
  assert.deepEqual(dialogProps({ labelledBy: 'title', describedBy: 'help' }), { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'title', 'aria-describedby': 'help' })
  assert.deepEqual(menuProps({ label: 'Actions' }), { role: 'menu', 'aria-label': 'Actions' })
  assert.deepEqual(menuItemProps({ disabled: true }), { role: 'menuitem', tabindex: '-1', 'aria-disabled': 'true' })
  const tabs = tabsProps({ tabId: 'tab-one', panelId: 'panel-one', label: 'Sections', selected: true })
  assert.equal(tabs.tab['aria-controls'], 'panel-one'); assert.equal(tabs.panel['aria-labelledby'], 'tab-one'); assert.equal(tabs.panel.hidden, undefined)
})

test('form and notification primitives expose validation and announcement semantics', () => {
  assert.deepEqual(fieldProps({ id: 'email', describedBy: 'email-help', errorId: 'email-error', invalid: true, required: true }), { id: 'email', 'aria-describedby': 'email-help email-error', 'aria-invalid': 'true', 'aria-required': 'true' })
  assert.deepEqual(notificationProps(), { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' })
  assert.deepEqual(notificationProps({ urgent: true }), { role: 'alert', 'aria-live': 'assertive', 'aria-atomic': 'true' })
  assert.match(focusVisibleCss(), /focus-visible/)
})

test('accessibility primitives reject invalid relationships', () => {
  assert.throws(() => dialogProps({ labelledBy: 'not valid' }), /valid HTML id/)
  assert.throws(() => tabsProps({ tabId: 'tab', panelId: '' }), /valid HTML id/)
  assert.throws(() => fieldProps({ id: 'email', invalid: 'yes' }), /invalid must be boolean/)
})
