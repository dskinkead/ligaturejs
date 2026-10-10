export function paginate(rows, { page = 1, pageSize = 25 } = {}) {
  page = positiveInteger(page, 'page'); pageSize = positiveInteger(pageSize, 'pageSize')
  const total = rows.length
  return Object.freeze({ items: rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total, pages: Math.ceil(total / pageSize) })
}

export function queryOptions({ filter, sort, page, pageSize } = {}) {
  if (filter !== undefined && typeof filter !== 'function') throw new TypeError('filter must be a function')
  if (sort !== undefined && typeof sort !== 'function') throw new TypeError('sort must be a function')
  const result = { filter, sort }
  if (page !== undefined || pageSize !== undefined) { const resultPage = paginate([], { page, pageSize }); result.offset = (resultPage.page - 1) * resultPage.pageSize; result.limit = resultPage.pageSize }
  return Object.freeze(result)
}

export function queryRows(rows, { filter, sort, search, searchFields, page, pageSize } = {}) {
  if (!Array.isArray(rows)) throw new TypeError('rows must be an array')
  if (search !== undefined && typeof search !== 'string') throw new TypeError('search must be a string')
  if (searchFields !== undefined && (!Array.isArray(searchFields) || searchFields.some(field => typeof field !== 'string'))) throw new TypeError('searchFields must be an array of strings')
  let result = rows.slice()
  if (typeof filter === 'function') result = result.filter(filter)
  if (search?.trim()) {
    const needle = search.trim().toLocaleLowerCase()
    result = result.filter(row => (searchFields ?? Object.keys(row ?? {})).some(field => String(row?.[field] ?? '').toLocaleLowerCase().includes(needle)))
  }
  if (typeof sort === 'function') result.sort(sort)
  return page === undefined && pageSize === undefined ? result : paginate(result, { page, pageSize }).items
}

export function scopedRepository(repository, authorize) {
  if (!repository?.methods || typeof authorize !== 'function') throw new TypeError('scopedRepository requires a repository and authorize function')
  const methods = Object.fromEntries(Object.entries(repository.methods).map(([name, method]) => [name, async (...args) => { const context = args.at(-1); if (!await authorize(context)) throw new Error('Repository authorization denied'); return method(...args) }]))
  return Object.freeze({ name: repository.name, methods: Object.freeze(methods) })
}

function positiveInteger(value, name) { if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer`); return value }
