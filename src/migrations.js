export function defineMigration({ id, description, up, down }) {
  if (!id || !description || typeof up !== 'function' || typeof down !== 'function') throw new Error('Migration requires id, description, up, and down')
  return Object.freeze({ id, description, up, down })
}
export function migrationManifest(migrations) { return migrations.map(({ id, description }) => ({ id, description })) }
