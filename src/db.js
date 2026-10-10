export function defineDatabaseAdapter(adapter) {
  for (const method of ['query', 'begin', 'commit', 'rollback']) if (typeof adapter?.[method] !== 'function') throw new Error(`Database adapter requires ${method}`)
  const result = { query: adapter.query.bind(adapter), begin: adapter.begin.bind(adapter), commit: adapter.commit.bind(adapter), rollback: adapter.rollback.bind(adapter) }
  for (const method of ['execute', 'close']) if (typeof adapter?.[method] === 'function') result[method] = adapter[method].bind(adapter)
  return Object.freeze(result)
}

export function observeDatabase(adapter, { onEvent, slowQueryMs = 0 } = {}) {
  if (!adapter || typeof onEvent !== 'function') throw new TypeError('observeDatabase requires an adapter and onEvent callback')
  if (!Number.isFinite(slowQueryMs) || slowQueryMs < 0) throw new RangeError('slowQueryMs must be non-negative')
  const observed = {}
  for (const method of ['query', 'execute', 'begin', 'commit', 'rollback', 'close']) {
    if (typeof adapter[method] !== 'function') continue
    observed[method] = async (...args) => {
      const started = performance.now()
      try {
        const result = await adapter[method](...args)
        const duration = performance.now() - started
        if ((method === 'query' || method === 'execute') && duration >= slowQueryMs) onEvent(Object.freeze({ type: 'slow-query', method, duration, operation: args[0] }))
        return result
      } catch (error) {
        onEvent(Object.freeze({ type: method === 'query' || method === 'execute' ? 'query-error' : 'transaction-error', method, duration: performance.now() - started, error }))
        throw error
      }
    }
  }
  return defineDatabaseAdapter(observed)
}
export function createMemoryDatabase(initial = {}) {
  const state = structuredClone(initial); let snapshot
  return defineDatabaseAdapter({
    async query(table, options = {}) {
      let rows = structuredClone(state[table] ?? [])
      if (typeof options.filter === 'function') rows = rows.filter(options.filter)
      if (typeof options.sort === 'function') rows.sort(options.sort)
      if (options.offset !== undefined) rows = rows.slice(Number(options.offset))
      if (options.limit !== undefined) rows = rows.slice(0, Number(options.limit))
      return rows
    },
    async execute(table, rows) { state[table] = structuredClone(rows); return structuredClone(state[table]) },
    async begin() { if (snapshot) throw new Error('Transaction already active'); snapshot = structuredClone(state) },
    async commit() { snapshot = undefined },
    async rollback() { if (!snapshot) return; Object.keys(state).forEach(key => delete state[key]); Object.assign(state, structuredClone(snapshot)); snapshot = undefined }
  })
}

// Reference adapters intentionally depend on a supplied driver, keeping the
// framework independent of vendor packages and connection pools.
export function createSqliteAdapter(database) {
  if (!database || typeof database.prepare !== 'function' || typeof database.exec !== 'function') throw new Error('SQLite adapter requires a database with prepare and exec')
  return defineDatabaseAdapter({
    query(sql, params = []) { return database.prepare(sql).all(...params) },
    execute(sql, params = []) { return database.prepare(sql).run(...params) },
    begin() { database.exec('BEGIN') }, commit() { database.exec('COMMIT') }, rollback() { database.exec('ROLLBACK') },
    close() { database.close?.() }
  })
}

export function createMysqlAdapter(connection) {
  if (!connection || typeof connection.query !== 'function') throw new Error('MySQL adapter requires a connection with query')
  return defineDatabaseAdapter({
    async query(sql, params = []) { const [rows] = await connection.query(sql, params); return rows },
    async execute(sql, params = []) { const [result] = await connection.query(sql, params); return result },
    begin() { return connection.beginTransaction() }, commit() { return connection.commit() }, rollback() { return connection.rollback() },
    close() { return connection.end?.() }
  })
}
