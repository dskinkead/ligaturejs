# Accessibility requirements and component checklist

Ligature components must remain useful as server-rendered HTML with JavaScript
disabled. Every interactive component owns its accessible name, state, and
keyboard behavior; accessibility is not deferred to a client mount hook.

## Required checklist

- Use native HTML first (`button`, `a`, `label`, `input`, headings, and lists).
- Give every control a visible label or an explicit accessible name.
- Associate help and validation text with `fieldProps({ id, describedBy,
  errorId, invalid, required })`.
- Keep focus visible. `focusVisibleCss()` is a neutral baseline; themes may
  change its color but must not remove the outline.
- Dialogs need a labelled title, a description when useful, `aria-modal`, a
  close button, initial focus, and focus restoration. Use `dialogProps()` and
  the existing `focusTrap()` lifecycle helper.
- Menus use roving focus and Arrow/Home/End/Escape behavior. Use `menuProps()`
  and `menuItemProps()`; do not use a menu role for ordinary site navigation.
- Tabs keep tab, tablist, and tabpanel IDs linked and expose selection with
  `aria-selected`. `tabsProps()` produces the required relationships.
- Forms announce errors next to the invalid field and use a polite live region
  for non-urgent status. Use `notificationProps({ urgent })` for status and
  alert announcements.
- Support zoom to 200%, touch targets, reduced motion, and high contrast. Do
  not encode meaning using color alone.

## Testing

Run the semantic primitive tests and the axe audit:

```sh
node --test test/accessibility-primitives.test.js test/accessibility.test.js
npm run test:a11y
```

Generated applications include semantic landmarks and a visible-focus
baseline. Add component-specific keyboard workflows and an axe audit for each
new interactive surface.
