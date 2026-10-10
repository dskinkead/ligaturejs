export async function planMigrations(migrations, applied = []) {
  validateMigrations(migrations)
  const done = new Set(applied)
  return migrations.filter(migration => !done.has(migration.id)).sort((a, b) => a.id.localeCompare(b.id))
}
export async function applyMigrations(migrations, adapter, applied = []) {
  const pending = await planMigrations(migrations, applied)
  for (const migration of pending) {
    await migration.up(adapter)
    applied.push(migration.id)
  }
  return applied
}
export function migrationStatus(migrations, applied = []) {
  validateMigrations(migrations)
  const done = new Set(applied)
  return Object.freeze(migrations.slice().sort((a, b) => a.id.localeCompare(b.id)).map(migration => Object.freeze({ id: migration.id, description: migration.description, applied: done.has(migration.id) })))
}
export async function rollbackMigration(migrations, adapter, applied = []) {
  validateMigrations(migrations)
  const id = applied.at(-1)
  if (!id) return applied
  const migration = migrations.find(item => item.id === id)
  if (!migration) throw new Error(`Applied migration '${id}' is not declared`)
  await migration.down(adapter)
  applied.pop()
  return applied
}
function validateMigrations(migrations) {
  const ids = new Set()
  for (const migration of migrations) {
    if (!migration?.id || ids.has(migration.id)) throw new Error(`Migration IDs must be unique: ${migration?.id ?? 'missing'}`)
    ids.add(migration.id)
  }
}
