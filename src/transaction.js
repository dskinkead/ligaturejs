export async function withTransaction(adapter, work, options = {}) {
  if (!adapter?.begin || !adapter?.commit || !adapter?.rollback) throw new Error('Transaction adapter requires begin, commit, and rollback')
  if (typeof work !== 'function') throw new TypeError('Transaction work must be a function')
  const retries = options.retries ?? 0
  if (!Number.isInteger(retries) || retries < 0) throw new RangeError('Transaction retries must be a non-negative integer')
  const timeout = options.timeout
  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) throw new RangeError('Transaction timeout must be a positive number')
  const retryOn = options.retryOn ?? (() => false)
  if (typeof retryOn !== 'function') throw new TypeError('Transaction retryOn must be a function')
  for (let attempt = 0; ; attempt += 1) {
    await adapter.begin()
    try {
      const result = timeout === undefined ? await work(adapter, { attempt, signal: options.signal }) : await withTimeout(work(adapter, { attempt, signal: options.signal }), timeout)
      await adapter.commit()
      return result
    } catch (error) {
      try { await adapter.rollback() } catch (rollbackError) { error.rollbackError = rollbackError }
      if (attempt >= retries || !retryOn(error, attempt)) throw error
    }
  }
}

export async function withConnection(adapter, work) {
  if (typeof adapter?.close !== 'function') throw new Error('Connection adapter requires close')
  if (typeof work !== 'function') throw new TypeError('Connection work must be a function')
  try { return await work(adapter) } finally { await adapter.close() }
}

async function withTimeout(value, milliseconds) {
  let timer
  try {
    return await Promise.race([Promise.resolve(value), new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error(`Transaction timed out after ${milliseconds}ms`), { code: 'TRANSACTION_TIMEOUT' })), milliseconds)
    })])
  } finally { clearTimeout(timer) }
}
