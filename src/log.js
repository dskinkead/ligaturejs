export function createLogger(name = 'app', output = console, context = {}) {
  if (typeof name !== 'string' || !name) throw new TypeError('Logger name must be a non-empty string')
  if (!output || typeof output !== 'object') throw new TypeError('Logger output must be an object')
  const logger = {}
  for (const level of ['debug', 'info', 'warn', 'error']) {
    logger[level] = (message, details = {}) => {
      if (typeof message !== 'string') throw new TypeError('Log message must be a string')
      const fields = { ...context, ...details }
      output[level]?.(JSON.stringify({ time: new Date().toISOString(), level, name, message, details: fields }))
    }
  }
  logger.child = (childContext = {}) => {
    if (!childContext || typeof childContext !== 'object' || Array.isArray(childContext)) throw new TypeError('Logger context must be an object')
    return createLogger(name, output, { ...context, ...childContext })
  }
  return Object.freeze(logger)
}
