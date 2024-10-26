/** @import { Cookie, RequestEvent } from '../types.js' */

import { initRouter } from './runtime/internal.js'
import { addCookiesToHeaders, getCookies, isFormContentType, redirectResponse, resolve } from './runtime/fetch.js'
import { Redirect } from './runtime/shared.js'

export class Xink {
  constructor() {
    this.router
  }

  async init() {
    this.router = await initRouter()
  }

  /* ATTR: SvelteKit */
  /**
   *
   * @param {Request} request
   * @returns {Promise<Response>}
   */
  async fetch(request) {
    /** @type {Record<string, Cookie>} */
    let cookies_to_add ={}
    /** @type {Record<string, string>} */
    const headers = {}
    const url = new URL(request.url)

    /* CSRF Content Type and Origin Check. */
    const forbidden = 
      isFormContentType(request) && 
      (request.method === 'POST' || request.method === 'DELETE' || request.method === 'PUT' || request.method === 'PATCH') && 
      request.headers.get('origin') !== url.origin

    if (forbidden) {
      if (request.headers.get('accept') === 'application/json') {
        return json(`Cross-site ${request.method} form submissions are forbidden`, { status: 403 })
      }
      return text(`Cross-site ${request.method} form submissions are forbidden`, { status: 403 })
    }

    const { store, params } = this.router.find(url.pathname) || {}
    const handle = this.router.getMiddleware()
    const { cookies, new_cookies } = getCookies(request, url)

    cookies_to_add = new_cookies

    /**
     * @type {RequestEvent}
     */
    const event = {
      cookies,
      headers: request.headers,
      locals: {},
      params: params || {},
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
      url
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
      if (response.status === 200 && response.headers.has('etag')) {
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

      // TODO handle other errors
    }
  }
}
