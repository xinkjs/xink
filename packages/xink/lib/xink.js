/** @import { Context, Cookie, ErrorHandler, Middleware, RequestEvent } from "../types.js" */

import { Router } from "@xinkjs/xin"
import { json, text, html, redirect } from './runtime/helpers.js'
import { addCookiesToHeaders, getCookies, isFormContentType, redirectResponse, resolve } from './runtime/fetch.js'
import { Redirect } from './runtime/shared.js'
import { ALLOWED_HANDLERS } from './constants.js'
import { generateOpenapiForRouteMethods, openapi_template } from "./runtime/openapi.js"

export class Xink extends Router {
  /** @type {string} */
  #base_path
  /** @type {ErrorHandler} */
  #error_handler
  /** @type {Middleware} */
  #middleware = (event, resolve) => resolve(event)
  /** @type {object} */
  #openapi = {
    paths: {},
    metadata: { 
      openapi: "3.1.0"
    }
  }
  #is_initialized = false
  #router = false
  #manifest = null

  constructor() {
    super()
    this.#base_path
    this.#error_handler
    this.#middleware
    this.#openapi
  }

  /**
   * 
   * @param {string} path
   */
  path(path) {
    if (typeof path !== 'string')
      throw new TypeError('Basepath must be a string.')
    if (path.charAt(0) !== '/')
      throw new Error('Basepath must start with a forward slash "/"')

    this.#base_path = path
  }

  /* ATTR: SvelteKit */
  /**
   *
   * @param {Request} request
   * @param { { env: Env.Bindings, ctx: Context } } [context]
   * @returns {Promise<Response>}
   */
  fetch = async (request, context = null) => {
    if (!this.#is_initialized) await this.#init()
    if (!this.#router) {
      console.error('[Xink] Router not available, returning 500.')
      return new Response('Internal server error: Xink router not initialized.', {
        status: 500
      })
    }

    /** @type {Record<string, Cookie>} */
    let cookies_to_add ={}
    /** @type {Record<string, string>} */
    const headers = {}
    const url = new URL(request.url)

    /* Handle OpenAPI docs request. */
    if (url.pathname === this.#openapi.path)
      return html(openapi_template({ ...this.#openapi.metadata, paths: this.#openapi.paths }))

    /* Handle OpenAPI schema request. */
    if (url.pathname === this.#openapi.path + '/schema')
      return json({ ...this.#openapi.metadata, paths: this.#openapi.paths })

    /* CSRF Content Type and Origin Check. */
    const check_origin = XINK_CHECK_ORIGIN
    
    if (check_origin) {
      const forbidden = 
        (request.method === 'POST' || request.method === 'DELETE' || request.method === 'PUT' || request.method === 'PATCH') &&  
        request.headers.get('origin') !== url.origin &&  
        isFormContentType(request)

      if (forbidden) {
        if (request.headers.get('accept') === 'application/json') {
          return json(`Cross-site ${request.method} form submissions are forbidden`, { status: 403 })
        }
        return text(`Cross-site ${request.method} form submissions are forbidden`, { status: 403 })
      }
    }

    const { store, params } = this.find(url.pathname) || {}
    const handle = this.#middleware
    const errorHandler = this.#error_handler
    const { cookies, new_cookies } = getCookies(request, url)

    cookies_to_add = new_cookies

    /**
     * @type {RequestEvent}
     */
    const event = {
      context,
      cookies,
      headers: request.headers,
      html,
      json,
      locals: {},
      params: params || {},
      redirect,
      request,
      store: store || null,
      /* ATTR: SvelteKit */
      setHeaders: (new_headers) => {
        for (const key in new_headers) {
          const lower = key.toLowerCase()
          const value = new_headers[key]
  
          if (lower === 'set-cookie') {
            throw new Error(
              'Use `event.cookies.set(name, value, options)` instead of `event.setHeaders` to set cookies'
            )
          } else if (lower in headers) {
            throw new Error(`"${key}" header is already set`)
          } else {
            headers[lower] = value
          }
        }
      },
      text,
      url,
      valid: {}
    }

    try {
      const response = await handle(event, (event) =>
        resolve(event).then((response) => {
          for (const key in headers) {
            const value = headers[key]
            response.headers.set(key, value)
          }

          addCookiesToHeaders(response.headers, Object.values(cookies_to_add))

          return response
        }) 
      )

      /* ATTR: SvelteKit */
      /* Respond with 304 if etag matches. */
      if (response.headers.has('etag') && response.status === 200) {
        let if_none_match_value = request.headers.get('if-none-match');

        /* Ignore W/ prefix https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match#directives */
        if (if_none_match_value?.startsWith('W/"')) {
          if_none_match_value = if_none_match_value.substring(2);
        }

        const etag = /** @type {string} */ (response.headers.get('etag'));

        if (if_none_match_value === etag) {
          const headers = new Headers({ etag });

          /* https://datatracker.ietf.org/doc/html/rfc7232#section-4.1 + set-cookie */
          for (const key of [
            'cache-control',
            'content-location',
            'date',
            'expires',
            'vary',
            'set-cookie'
          ]) {
            const value = response.headers.get(key);
            if (value) headers.set(key, value);
          }

          return new Response(undefined, {
            status: 304,
            headers
          });
        }
      }

      return response
    } catch (err) {
      /* ATTR: SvelteKit */
      if (err instanceof Redirect) {
        const response = redirectResponse(err.status, err.location)
        addCookiesToHeaders(response.headers, Object.values(cookies_to_add))

        return response
      }

      /* Allow dev to handle error. */
      if (errorHandler) {
        const response = errorHandler(err, event)
        if (response)
          return response
      }

      /* Try to avoid throwing. */
      if (err.name || err.message)
        return new Response(`Error: ${err.name ?? 'Unknown'}: ${err.message ?? 'Unknown'}`)

      throw new Error(err)
    }
  }

  openapi({ path, data }) {
    this.#openapi.path = path
    if (data)
      /* Merge provided metadata with existing (paths are built during init). */
      this.#openapi.metadata = {
        ...(this.#openapi.metadata),
        ...data,
      }
  }

  /* Initialize the router. */
  async #init() {
    if (this.#is_initialized) return

    try {
      const { manifest } = await import('virtual:xink-manifest')
      this.#manifest = manifest

      /* Register params. */
      for (const [k, v] of Object.entries(this.#manifest.params)) {
        const matcher = v ?? null
        if (matcher) this.setMatcher(k, matcher)
      }

      /* Register middleware. */
      if (this.#manifest.middleware) this.#middleware = this.#manifest.middleware

      /* Register error handling. */
      if (this.#manifest.error) this.#error_handler = this.#manifest.error

      /* Register routes. */
      for (const route_info of this.#manifest.routes) {
        const derived_path = this.#base_path ? this.#base_path + (route_info.path === '/' ? '' : route_info.path) : route_info.path
        const store = this.register(derived_path)

        const handlers = route_info.handlers
        const schemas_export = handlers.HOOKS?.SCHEMAS || null
        const openapi_export = handlers.OPENAPI || null

        /* Create OpenAPI definition for route. */
        if (schemas_export || openapi_export) {
          /* Generate the OpenAPI definitions for all methods in this route module. */
          const openapi_for_methods_on_this_path = generateOpenapiForRouteMethods(schemas_export, openapi_export)

          /* Replace colons with surrounding curly braces, per OpenAPI spec. */
          const openapi_route_path = derived_path.replace(/:([\w.~-]+)/g, '{$1}')

          if (Object.keys(openapi_for_methods_on_this_path).length > 0) {
            if (!this.#openapi.paths[openapi_route_path]) {
              this.#openapi.paths[openapi_route_path] = {}
            }
            /* Merge with any existing path definitions (shouldn't happen if paths are unique). */
            this.#openapi.paths[openapi_route_path] = {
              ...this.#openapi.paths[openapi_route_path],
              ...openapi_for_methods_on_this_path
            }
          }
        }

        /* Register HTTP handlers. */
        for (const method in handlers) {
          /* Do not store OPENAPI object. */
          if (method === 'OPENAPI') continue

          /* Ensure HTTP handlers are functions. */
          if (typeof handlers[method] !== 'function' && method !== 'HOOKS')
            throw new Error(`Handler ${method} for route ${route_info.path} is not a function.`)

          if (!ALLOWED_HANDLERS.has(method)) {
            console.warn(`Unsupported handler method '${method}' found for route ${route_info.path}. Skipping.`)
            continue
          }
          store[method] = handlers[method]
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
