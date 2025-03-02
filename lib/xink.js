/** @import { Context, Cookie, ErrorHandler, Middleware, RequestEvent } from "../types.js" */

import { Router } from "@xinkjs/xin"
import { json, text, html, redirect } from './runtime/helpers.js'
import { addCookiesToHeaders, getCookies, isFormContentType, redirectResponse, resolve } from './runtime/fetch.js'
import { Redirect } from './runtime/shared.js'
import { ALLOWED_HANDLERS } from './constants.js'
import process from 'node:process'

export class Xink extends Router {
  /** @type {string} */
  #base_path
  /** @type {ErrorHandler} */
  #error_handler
  /** @type {Middleware} */
  #middleware = (event, resolve) => resolve(event)
  /** @type {object} */
  #openapi = {
    paths: {}
  }

  constructor() {
    super()
    this.#base_path
    this.#error_handler
    this.#middleware
    this.#openapi
  }

  /* ATTR: SvelteKit */
  /**
   *
   * @param {Request} request
   * @param {Env.Bindings} [env]
   * @param {Context} [ctx]
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    /** @type {Record<string, Cookie>} */
    let cookies_to_add ={}
    /** @type {Record<string, string>} */
    const headers = {}
    const url = new URL(request.url)

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
      cookies,
      ctx,
      env,
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
    if (data) this.#openapi.metadata = data
  }

  /**
   * Initialize the router.
   * 
   * @param {string} [path] 
   */
  async init(path) {
    if (path) this.#base_path = path
    const mode = XINK_VITE_MODE
    const cwd = process.cwd()
    const manifest_file = './manifest.js'
    const { manifest } = mode === 'development' 
      ? await import(/* @vite-ignore */`${cwd}/.xink/manifest.js`) 
      : await import(/* @vite-ignore */manifest_file) // needed so rollup doesn't try to import during build.

    /* Register params. */
    for (const [k, v] of Object.entries(manifest.params)) {
      const matcher = (await import(mode === 'development' ? /* @vite-ignore */cwd + '/' + v[mode] : /* @vite-ignore */'./' + v[mode])).match ?? null
      if (matcher) this.setMatcher(k, matcher)
    }

    /* Register middleware. */
    if (manifest.middleware) {
      const handle = (await import(mode === 'development' ? /* @vite-ignore */cwd + '/' + manifest.middleware[mode] : /* @vite-ignore */'./' + manifest.middleware[mode])).handle ?? null
      if (handle) this.#middleware = handle
    }

    /* Register error handling. */
    if (manifest.error) {
      const handle = (await import(mode === 'development' ? /* @vite-ignore */cwd + '/' + manifest.error[mode] : /* @vite-ignore */'./' + manifest.error[mode])).handleError ?? null
      if (handle) this.#error_handler = handle
    }

    /* Register routes. */
    for (const [_k, v] of Object.entries(manifest.routes)) {
      const module = await import(`${mode === 'development' ? /* @vite-ignore */cwd + '/' + v[mode] : /* @vite-ignore */'./' + v[mode] }`)
      const handlers = Object.entries(module)
      const derived_path = this.#base_path ? this.#base_path + (v.path === '/' ? '' : v.path) : v.path
      const store = this.register(derived_path)

      for (const [method, handler] of handlers) {
        if (method === 'OPENAPI' && typeof handler === 'object') {
          this.#openapi.paths[derived_path] = handler
          continue
        }

        if (typeof handler !== 'function' && method !== 'HOOKS')
          throw new Error(`Handler ${method} for route ${v.path} is not a function.`)

        if (!ALLOWED_HANDLERS.has(method))
          throw new Error(`xink does not support the ${method} endpoint handler, found in ${v.file}`)

        store[method] = handler
      }
    }
  }
}
