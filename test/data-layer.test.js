import test from 'node:test'
import assert from 'node:assert/strict'
import { withTransaction, withConnection, defineMigration, planMigrations, applyMigrations, migrationStatus, rollbackMigration, createMemoryDatabase, createSqliteAdapter, createMysqlAdapter, defineDatabaseAdapter, observeDatabase, paginate, queryOptions, queryRows, scopedRepository, defineRepository, createValidationBoundary } from '../src/index.js'

test('transactions commit successful work and rollback failures', async () => {
  const events = []; const adapter = { begin: async () => events.push('begin'), commit: async () => events.push('commit'), rollback: async () => events.push('rollback') }
  await withTransaction(adapter, async () => 'ok'); assert.deepEqual(events, ['begin', 'commit'])
  await assert.rejects(() => withTransaction(adapter, async () => { throw new Error('bad') })); assert.deepEqual(events, ['begin', 'commit', 'begin', 'rollback'])
})

test('transactions support bounded retries, timeout, and connection cleanup', async () => {
  let attempts = 0; const events = []
  const adapter = { begin: async () => events.push('begin'), commit: async () => events.push('commit'), rollback: async () => events.push('rollback'), close: async () => events.push('close') }
  const value = await withTransaction(adapter, async (_, { attempt }) => { attempts++; if (attempt === 0) throw Object.assign(new Error('deadlock'), { code: 'ER_LOCK_DEADLOCK' }); return 'ok' }, { retries: 1, retryOn: error => error.code === 'ER_LOCK_DEADLOCK' })
  assert.equal(value, 'ok'); assert.equal(attempts, 2); assert.deepEqual(events, ['begin', 'rollback', 'begin', 'commit'])
  await assert.rejects(() => withTransaction(adapter, () => new Promise(() => {}), { timeout: 5 }), /timed out/)
  await withConnection(adapter, connection => { assert.equal(connection, adapter) }); assert.equal(events.at(-1), 'close')
})
test('migration runner plans and applies only pending migrations', async () => {
  const applied = []; const migrations = [defineMigration({ id: '002', description: 'two', up: async () => applied.push('two'), down: () => {} }), defineMigration({ id: '001', description: 'one', up: async () => applied.push('one'), down: () => {} })]
  assert.deepEqual((await planMigrations(migrations, ['001'])).map(m => m.id), ['002']); await applyMigrations(migrations, {}, ['001']); assert.deepEqual(applied, ['two'])
})

test('migration status and rollback are deterministic and reject duplicate ids', async () => {
  const events = []; const migrations = [defineMigration({ id: '002', description: 'two', up: async () => events.push('up2'), down: async () => events.push('down2') }), defineMigration({ id: '001', description: 'one', up: async () => {}, down: async () => {} })]
  assert.deepEqual(migrationStatus(migrations, ['001']).map(item => [item.id, item.applied]), [['001', true], ['002', false]])
  const applied = ['001', '002']; await rollbackMigration(migrations, {}, applied); assert.deepEqual(applied, ['001']); assert.deepEqual(events, ['down2'])
  assert.throws(() => migrationStatus([migrations[0], migrations[0]]), /unique/)
})

test('memory and reference adapters expose the same transaction boundary', async () => {
  const memory = createMemoryDatabase({ tasks: [{ id: 1 }] }); await memory.execute('tasks', [{ id: 2 }]); assert.deepEqual(await memory.query('tasks'), [{ id: 2 }])
  const calls = []; const sqlite = createSqliteAdapter({ prepare(sql) { return { all: (...p) => { calls.push(['all', sql, p]); return [] }, run: (...p) => { calls.push(['run', sql, p]); return { changes: 1 } } } }, exec: sql => calls.push(['exec', sql]) })
  sqlite.begin(); sqlite.execute('UPDATE tasks SET id = ?', [3]); sqlite.rollback(); assert.deepEqual(calls.map(call => call[1]), ['BEGIN', 'UPDATE tasks SET id = ?', 'ROLLBACK'])
  const mysqlCalls = []; const mysql = createMysqlAdapter({ query: async (...args) => { mysqlCalls.push(args); return [[{ id: 1 }], {}] }, beginTransaction: async () => mysqlCalls.push(['begin']), commit: async () => mysqlCalls.push(['commit']), rollback: async () => mysqlCalls.push(['rollback']) }); assert.deepEqual(await mysql.query('SELECT 1'), [{ id: 1 }]); await mysql.commit(); assert.equal(mysqlCalls.length, 2)
})

test('validation, pagination, query options, and authorization are explicit', async () => {
  const boundary = createValidationBoundary({ domain: value => ({ ...value, checked: true }) }); assert.deepEqual(boundary.domain({ id: 1 }), { id: 1, checked: true }); assert.deepEqual(boundary.http({ id: 1 }), { id: 1 })
  assert.deepEqual(paginate([1, 2, 3], { page: 2, pageSize: 2 }), { items: [3], page: 2, pageSize: 2, total: 3, pages: 2 }); assert.deepEqual(queryOptions({ page: 2, pageSize: 10 }).offset, 10)
  const base = defineRepository({ name: 'tasks', methods: { list: async context => [context.user] } }); const scoped = scopedRepository(base, context => context.user === 'admin'); assert.deepEqual(await scoped.methods.list({ user: 'admin' }), ['admin']); await assert.rejects(() => scoped.methods.list({ user: 'guest' }), /denied/)
  assert.deepEqual(queryRows([{ name: 'Beta', group: 'x' }, { name: 'Alpha', group: 'y' }], { search: 'alp', searchFields: ['name'], sort: (a, b) => a.name.localeCompare(b.name) }), [{ name: 'Alpha', group: 'y' }])
})

test('database observability reports slow and failed operations', async () => {
  const events = []; const base = defineDatabaseAdapter({ query: async () => [{ id: 1 }], execute: async () => { throw new Error('write failed') }, begin: async () => {}, commit: async () => {}, rollback: async () => {} }); const observed = observeDatabase(base, { slowQueryMs: 0, onEvent: event => events.push(event) })
  assert.deepEqual(await observed.query('tasks'), [{ id: 1 }]); await assert.rejects(() => observed.execute('tasks', []), /write failed/)
  assert.equal(events[0].type, 'slow-query'); assert.equal(events.at(-1).type, 'query-error'); assert.equal(events.at(-1).method, 'execute')
})
