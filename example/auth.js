export function demoAuth(req) { return { id: req.headers['x-demo-user'] || 'demo-user', roles: ['user'] } }
export function requireRole(user, role) { if (!user?.roles?.includes(role)) { const error = new Error('Forbidden'); error.status = 403; throw error } }
