import { defineComponent, type ComponentEventMap, type ComponentSlotName, type PropsFromRules } from '../../index.js'
const card = defineComponent({
  name: 'typed-card',
  props: { title: { type: 'string', required: true }, count: { type: 'number', default: 0 } },
  events: { select: 'typed-card:select' }, slots: ['body'] as const,
  render: props => `<article><h2>${props.title}</h2><output>${props.count}</output></article>`
})
type CardProps = PropsFromRules<NonNullable<typeof card.props>>
type CardEvents = ComponentEventMap<typeof card>
type CardSlots = ComponentSlotName<typeof card>
const props: CardProps = { title: 'Example', count: 0 }
const eventName: CardEvents['select'] = 'typed-card:select'
const slot: CardSlots = 'body'
void [props, eventName, slot]
