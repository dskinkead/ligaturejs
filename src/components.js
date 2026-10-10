import { defineComponent } from './component.js'
import { escapeAttribute, escapeText } from './escape.js'

export const Button = defineComponent({
  name: 'button', version: '1.0.0',
  props: { label: { type: 'string', required: true }, type: { type: 'string', default: 'button' }, disabled: { type: 'boolean', default: false } },
  events: { click: 'MouseEvent' },
  render: props => `<button type="${escapeAttribute(props.type)}"${props.disabled ? ' disabled' : ''}>${escapeText(props.label)}</button>`
})

export const Alert = defineComponent({
  name: 'alert', version: '1.0.0',
  props: { message: { type: 'string', required: true }, tone: { type: 'string', default: 'status' } },
  render: props => `<div role="${escapeAttribute(props.tone === 'error' ? 'alert' : 'status')}">${escapeText(props.message)}</div>`
})

export const Field = defineComponent({
  name: 'field', version: '1.0.0',
  props: { id: { type: 'string', required: true }, label: { type: 'string', required: true }, value: { type: 'string', default: '' } },
  render: props => `<label for="${escapeAttribute(props.id)}">${escapeText(props.label)}</label><input id="${escapeAttribute(props.id)}" value="${escapeAttribute(props.value)}">`
})

export const componentLibrary = Object.freeze({ Button, Alert, Field })
