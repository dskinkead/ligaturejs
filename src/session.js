export function sessionContract(options = {}) {
  const contract = { cookieName: options.cookieName ?? 'agent_session', httpOnly: true, sameSite: options.sameSite ?? 'lax', secure: options.secure ?? true, maxAge: options.maxAge ?? 604800000, idleTimeout: options.idleTimeout ?? 1800000, rolling: options.rolling ?? true, path: options.path ?? '/' }
  if (contract.sameSite === 'none' && !contract.secure) throw new TypeError('SameSite=None requires secure cookies')
  if (!Number.isInteger(contract.maxAge) || contract.maxAge <= 0 || !Number.isInteger(contract.idleTimeout) || contract.idleTimeout <= 0) throw new RangeError('Session lifetimes must be positive integers')
  return Object.freeze(contract)
}

export function createSessionManager(options = {}) {
  const contract = sessionContract(options); const sessions = new Map(); const now = options.now ?? (() => Date.now())
  const fresh = data => { const id = crypto.randomBytes(32).toString('base64url'); const session = { id, data: { ...(data ?? {}) }, createdAt: now(), lastSeenAt: now() }; sessions.set(id, session); return Object.freeze({ id, data: Object.freeze({ ...session.data }) }) }
  const read = id => { const session = sessions.get(id); if (!session || now() - session.lastSeenAt > contract.idleTimeout || now() - session.createdAt > contract.maxAge) { if (session) sessions.delete(id); return null } session.lastSeenAt = now(); return Object.freeze({ id: session.id, data: Object.freeze({ ...session.data }) }) }
  return Object.freeze({ contract, create: fresh, get: read, rotate: id => { const current = read(id); if (!current) return null; sessions.delete(id); return fresh(current.data) }, destroy: id => sessions.delete(id), size: () => sessions.size })
}
import crypto from 'node:crypto'
