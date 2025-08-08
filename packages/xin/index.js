/** @import { ErrorHandler, Handle, NotFoundHandler, RequestEvent } from './types.js' */

import { Router as URLRouter } from "@xinkjs/xi"
import { sequence } from "./lib/utils.js"
import { addCookiesToHeaders, redirectResponse, resolve } from "./lib/runtime/fetch.js"
import { json, text, html, redirect } from './lib/runtime/helpers.js'
import { Redirect } from './lib/runtime/shared.js'
import { ALLOWED_HANDLERS } from './lib/constants.js'
import { openapi_template } from "./lib/runtime/openapi.js"

/**
 * @extends {URLRouter<RequestEvent>}
 */
export class Router extends URLRouter {
  /** @type {NotFoundHandler|undefined} */
  notFoundHandler
  /** @type {ErrorHandler|undefined} */
  errorHandler
  /** @type {Handle[]} Registry of middleware functions */
  middleware = []

  constructor() {
    super()
  }

  /**
   * Request handler
   * 
   * @param {Request} request The original request
   * @param {{ [key: string]: any }} [platform] A custom object for platform contexts
   * @returns {Promise<Response>}
   */
  fetch = async (request, platform) => { // must be an arrow function!!
    const url = new URL(request.url)
    const { store, params } = super.find(url.pathname)
    const event = { params, platform, request, store, url }
    const middleware = this.middleware
    const handle = sequence(...middleware)
    const errorHandler = this.errorHandler
    const notFoundHandler = this.notFoundHandler
    /** @type {Record<string, Cookie>} */
    let cookies_to_add ={}
    /** @type {Record<string, string>} */
    const headers = {}

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
   * Register middleware
   * 
   * Accepts a comma-separated list of middleware functions.
   * 
   * @param {...Handle} middleware
   */
  use(...middleware) {
    this.middleware.push(...middleware)
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
}
