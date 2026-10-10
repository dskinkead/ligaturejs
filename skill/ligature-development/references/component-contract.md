# Component contract

Define each component with a stable kebab-case name, explicit props, deterministic server rendering, and declared client behavior.

Keep database calls outside rendering. Escape every user-controlled value before inserting HTML. Use mount for setup, update for targeted changes, and unmount for listeners, timers, observers, and subscriptions. Keep state instance-local and avoid undeclared globals.

Register the component in the registry and verify its rendered instance metadata and client asset. Add a component test for required/typed props, escaped output, and lifecycle behavior.
