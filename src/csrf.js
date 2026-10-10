import crypto from 'node:crypto'
export function csrfToken(session = {}) { if (!session.csrfToken) session.csrfToken = crypto.randomBytes(24).toString('base64url'); return session.csrfToken }
export function verifyCsrf(session, token) { if (!session?.csrfToken || !token || session.csrfToken.length !== String(token).length) return false; return crypto.timingSafeEqual(Buffer.from(session.csrfToken), Buffer.from(String(token))) }
export function csrfMiddleware(options = {}) { const unsafe = new Set(options.methods ?? ['POST', 'PUT', 'PATCH', 'DELETE']); return (req, res, next) => { if (unsafe.has(req.method) && !verifyCsrf(req.session, req.headers?.['x-csrf-token'] ?? req.body?._csrf)) return res.status(403).json({ error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' } }); next() } }
