import { Xin } from "@xinkjs/xin"
import { ALLOWED_HANDLERS, STRICT_HANDLERS } from './constants.js'

export class Xink extends Xin {
  #is_initialized = false
  #router = false
  #manifest = null

  constructor(options) {
    super(options)
  }

  fetch = async (request, platform = {}) => {
    if (!this.#is_initialized) await this.#init()
    if (!this.#router) {
      console.error('[Xink] Router not available, returning 500.')
      return new Response('Internal server error: Xink router not initialized.', {
        status: 500
      })
    }

    return await super.fetch(request, platform)
  }

  /* Initialize the router. */
  async #init() {
    if (this.#is_initialized) return

    try {
      const { manifest } = await import('virtual:xink-manifest')
      this.#manifest = manifest

      /* Register param matchers. */
      for (const [k, v] of Object.entries(this.#manifest.params)) {
        this.matcher(k, v)
      }

      /* Register middleware. */
      if (this.#manifest.middleware) this.use(this.#manifest.middleware)

      /* Register error handling. */
      if (this.#manifest.error) this.onError(this.#manifest.error)
      if (this.#manifest.notfound) this.onNotFound(this.#manifest.notfound)

      /* Register routes. */
      for (const route_info of this.#manifest.routes) {
        const { base_path } = this.getConfig()
        const derived_path = base_path ? base_path + (route_info.path === '/' ? '' : route_info.path) : route_info.path
        
        const handlers = route_info.handlers
        const hooks = handlers.HOOKS || {}
        const schemas = hooks?.SCHEMAS || {}
        const openapi = handlers.OPENAPI || {}

        const store = this.route(derived_path, openapi)

        if (hooks && typeof hooks === 'object') {
          for (const [name, value] in hooks) {
            if (name !== 'SCHEMAS') // is not a developer hook
              store.hook(value)
          }
        }

        /* Register HTTP handlers. */
        for (const method in handlers) {
          if (!ALLOWED_HANDLERS.has(method)) {
            console.warn(`Unsupported handler method '${method}' found for route ${route_info.path}. Skipping.`)
            continue
          }
          if (!STRICT_HANDLERS.has(method)) {
            // found HOOKS or OPENAPI
            continue
          }
          /* Ensure HTTP handlers are functions. */
          if (typeof handlers[method] !== 'function')
            throw new Error(`Handler ${method} for route ${route_info.path} is not a function.`)

          switch (method) {
            case 'GET':
              store.get(schemas.get, handlers[method])
              break;
            case 'POST':
              store.post(schemas.post, handlers[method])
              break;
            case 'PUT':
              store.put(schemas.put, handlers[method])
              break;
            case 'PATCH':
              store.patch(schemas.patch, handlers[method])
              break;
            case 'DELETE':
              store.delete(schemas.delete, handlers[method])
              break;
            case 'HEAD':
              store.head(schemas.head, handlers[method])
              break;
            case 'OPTIONS':
              store.options(schemas.options, handlers[method])
              break;
            case 'default':
              store.fallback(schemas.default || {}, handlers[method])
              break;
            default:
              break;
          } 
        }
      }

      this.#is_initialized = true
      this.#router = true
    } catch (error) {
      console.error('[Xink] Initialization failed:', error)
      throw new Error(`Xink initialization failed: ${error.message}`)
    }
  }
}
