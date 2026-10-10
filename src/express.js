import { clientRuntime, componentClientSource } from './client.js'
import { assetVersion } from './assets.js'

export function ligatureMiddleware(registry, options = {}) {
  const prefix = options.prefix ?? '/__agent_tags'
  return (req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff')
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'")
    if (req.path === `${prefix}/manifest.json`) { res.set('Cache-Control', 'no-store'); return res.json({ version: '1', components: registry.manifest(), assets: registry.assets() }) }
    if (req.path === `${prefix}/runtime.js`) { return sendAsset(res, 'js', clientRuntime(options.runtime)) }
    const match = req.path.match(new RegExp(`^${prefix}/components/([^/]+)\\.js$`))
    if (match) {
      try { const component = registry.get(match[1]); return sendAsset(res, 'js', componentClientSource(component)) } catch { res.status(404).end() }
      return
    }
    const styleMatch = req.path.match(new RegExp(`^${prefix}/components/([^/]+)\\.css$`))
    if (styleMatch) {
      try { const component = registry.get(styleMatch[1]); return sendAsset(res, 'css', typeof component.styles === 'string' ? component.styles : component.styles?.css ?? '') } catch { res.status(404).end() }
      return
    }
    next()
  }
}

function sendAsset(res, type, source) {
  const version = assetVersion(source)
  res.set('Cache-Control', 'public, max-age=31536000, immutable')
  res.set('ETag', `"${version}"`)
  res.type(type).send(source)
}

/** @deprecated Use ligatureMiddleware. Kept through the next major release. */
export const agentTagsMiddleware = ligatureMiddleware
