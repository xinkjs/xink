/** @import { ApiReferenceConfiguration, XinConfig, Cookie, ErrorHandler, Handle, NotFoundHandler, RequestEvent } from './types.js' */
/** @import { Store } from '@xinkjs/xi*/

import { Xi } from "@xinkjs/xi"
import { sequence } from "./lib/runtime/utils.js"
import { validateConfig } from "./lib/config.js"
import { addCookiesToHeaders, getCookies, isFormContentType, redirectResponse, resolve } from "./lib/runtime/fetch.js"
import { json, text, html, redirect, Redirect } from './lib/runtime/helpers.js'
import { openapi_template } from "./lib/runtime/openapi.js"

/**
 * @extends {Xi<RequestEvent>}
 */
export class Xin extends Xi {
  /** @type {NotFoundHandler|undefined} */
  notFoundHandler
  /** @type {ErrorHandler|undefined} */
  errorHandler
  /** @type {Handle[]} Registry of middleware functions */
  middleware = []
  #openapi = {
    path: '',
    paths: {},
    metadata: { 
      openapi: "3.1.0"
    },
    scalar: {}
  }
  /** @type {XinConfig} A xin configuration object */
  #config

  /** @param {Partial<XinConfig>} [options] */
  constructor(options = {}) {
    super(options)
    this.#config = validateConfig(options)

    /**
     * Necessary for proper "this" binding,
     * as higher-level implementations may need
     * their own `fetch` to be an arrow function;
     * which means Xin's fetch cannot be.
     */
    this.fetch = this.fetch.bind(this)
  }

  /**
   * Request handler
   * 
   * @param {Request} request The original request
   * @param {Record<string, any>} [env] A custom object for platform environment
   * @param {Record<string, any>} [ctx] A custom object for platform context
   * @returns {Promise<Response>}
   */
  async fetch(request, env = {}, ctx = {}) { // must not be an arrow function!!
    const url = new URL(request.url)
    const { store, params } = this.find(url.pathname)
    const middleware = this.middleware
    const handle = sequence(...middleware)
    const errorHandler = this.errorHandler
    const notFoundHandler = this.notFoundHandler
    /** @type {Record<string, Cookie>} */
    let cookies_to_add ={}
    /** @type {Record<string, string>} */
    const headers = {}

    /* Handle OpenAPI docs request. */
    if (url.pathname === this.#openapi.path)
      return html(openapi_template({ ...this.#openapi.metadata, paths: this.#openapi.paths }, this.#openapi.scalar))

    /* Handle OpenAPI schema request. */
    if (url.pathname === this.#openapi.path + '/schema')
      return json({ ...this.#openapi.metadata, paths: this.#openapi.paths })

    /* CSRF Content Type and Origin Check. */
    if (this.#config.check_origin) {
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

    const { cookies, new_cookies } = getCookies(request, url)
    
    cookies_to_add = new_cookies

    const event = { 
      cookies,
      headers: request.headers,
      html,
      json,
      locals: {},
      params,
      redirect,
      platform: { env, ctx },
      request,
      store,
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
      let response = await handle(event, (event) =>
        resolve(event).then((response) => {
          for (const key in headers) {
            const value = headers[key]
            response.headers.set(key, value)
          }

          addCookiesToHeaders(response.headers, Object.values(cookies_to_add))

          return response
        }) 
      )
  
      /* Respond with custom Not Found handler. */
      if (
        notFoundHandler && 
        response.status === 404 && 
        response.headers.get('x-xin-default-404') // should only be set by xin 404 response in `resolve()`
      )
        response = notFoundHandler(event)

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

  /**
   * Gets all middleware
   * 
   * @returns {Handle[]}
   */
  getMiddleware() {
    return this.middleware
  }

  /**
   * 
   * @param {ErrorHandler} handler 
   */
  onError(handler) {
    this.errorHandler = handler
  }

  /**
   * 
   * @param {NotFoundHandler} handler 
   */
  onNotFound(handler) {
    this.notFoundHandler = handler
  }

  /**
   * @typedef {object} OpenApiMetadata
   * @property {string} path
   * @property {{ openapi?: string, info?: { title?: string, version?: string } }} [data]
   * @property {Partial<ApiReferenceConfiguration>} [scalar]
   */
  /**
   * Set openapi data and Scalar options
   * 
   * @param {OpenApiMetadata} metadata
   */
  openapi({ path, data, scalar }) {
    this.#openapi.path = path
    if (data)
      /* Merge provided metadata with existing (paths are built during init). */
      this.#openapi.metadata = {
        ...(this.#openapi.metadata),
        ...data,
      }

    if (scalar) this.#openapi.scalar = scalar
  }

  route(path, openapi) {
    const store = super.route(path)
    /** @type {Record<string, any>} */
    const openapi_schema = {}
    const { base_path } = super.getConfig()
    const derived_path = base_path ? base_path + (path === '/' ? '' : path) : path
    
    if (openapi && typeof openapi === 'object') {
      const { tags: global_tags } = openapi
      
      for (const method in openapi) {
        const operation = openapi[method]

        if (typeof operation === 'object' && operation !== null) {
          const operation_copy = { ...operation }

          if (global_tags && Array.isArray(global_tags) && global_tags.length > 0) {
            if (Array.isArray(operation_copy.tags)) {
              /* Merge local and global tags. */
              operation_copy.tags = [...new Set([...operation_copy.tags, ...global_tags])]
            } else {
              operation_copy.tags = global_tags
            }
          }

          openapi_schema[method] = operation_copy
        }
      }

      if (Object.keys(openapi_schema).length > 0)
        this.#openapi.paths[derived_path] = openapi_schema
    }

    return store
  }

  /**
   * Register middleware
   * 
   * Accepts a comma-separated list of middleware functions.
   * 
   * @param {...Handle} middleware
   */
  use(...middleware) {
    this.middleware.push(...middleware)
  }
}
