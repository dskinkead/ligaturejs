import { badRequest } from './errors.js'

export function validateInput(schema, value = {}) {
  const result = {}
  for (const [key, type] of Object.entries(schema ?? {})) {
    if (value[key] === undefined || value[key] === null) throw badRequest(`Missing input: ${key}`, { field: key })
    if (type === 'string' && typeof value[key] !== 'string') throw badRequest(`Invalid input: ${key}`, { field: key })
    if (type === 'boolean' && typeof value[key] !== 'boolean') throw badRequest(`Invalid input: ${key}`, { field: key })
    result[key] = value[key]
  }
  return result
}

export function createValidationBoundary({ http, domain, persistence } = {}) {
  const validators = { http, domain, persistence }
  for (const [name, validator] of Object.entries(validators)) if (validator !== undefined && typeof validator !== 'function') throw new TypeError(`${name} validator must be a function`)
  return Object.freeze({
    http(value) { return validators.http ? validators.http(value) : value },
    domain(value) { return validators.domain ? validators.domain(value) : value },
    persistence(value) { return validators.persistence ? validators.persistence(value) : value }
  })
}
