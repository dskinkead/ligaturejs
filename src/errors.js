export class LigatureError extends Error { constructor(code, message, details = {}) { super(message); this.name = 'LigatureError'; this.code = code; this.details = details } }
export function badRequest(message, details) { return new LigatureError('BAD_REQUEST', message, details) }
