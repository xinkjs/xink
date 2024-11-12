/** @import { Cookie, Cookies, ResolveEvent } from '../../types.js' */
/** @import { CookieParseOptions, CookieSerializeOptions } from 'cookie' */

import { parse, serialize } from 'cookie'
import { isContentType } from './utils.js'
import { json } from './helpers.js'

/* ATTR: SvelteKit */
/**
 * 
 * @param {Headers} headers 
 * @param {Cookie[]} cookies 
 */
export const addCookiesToHeaders = (headers, cookies) => {
  for (const new_cookie of cookies) {
    const { name, value, options } = new_cookie

    headers.append('set-cookie', serialize(name, value, options))
  }
}

/* ATTR: SvelteKit */
/**
 * 
 * @param {Request} request 
 * @param {URL} url
 */
export const getCookies = (request, url) => {
  const header = request.headers.get('cookie') ?? ''
  const localhost = new Set(['localhost', '127.0.0.1', '::1'])
  const is_local = localhost.has(url.hostname)

  const defaults = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: is_local && url.protocol === 'http:' ? false : true
  }

  /** @type {Record<string, Cookie>} */
  const new_cookies = {}

  /**
   * @type {Cookies}
   */
  const cookies = {
    /**
     * 
     * @param {string} name 
     * @param {CookieSerializeOptions} options 
     */
    delete(name, options) {
      cookies.set(name, '', { ...options, maxAge: 0 })
    },

    /**
     * 
     * @param {string} name 
     * @param {CookieParseOptions} [options] 
     */
    get(name, options) {
      const c = new_cookies[name]

      if (
        c &&
        domainMatches(url.hostname, c.options.domain) &&
        pathMatches(url.pathname, c.options.path)
      ) {
        return c.value
      }

      const decoder = options?.decode || decodeURIComponent
      const request_cookies = parse(header, { decode: decoder })
      const cookie = request_cookies[name]

      return cookie
    },

    /**
     * 
     * @param {CookieParseOptions} [options]
     */
    getAll(options) {
      const decoder = options?.decode || decodeURIComponent
      const cookies = parse(header, { decode: decoder })

      for (const c of Object.values(new_cookies)) {
        if (
          domainMatches(url.hostname, c.options.domain) &&
          pathMatches(url.pathname, c.options.path)
        ) {
          cookies[c.name] = c.value
        }
      }

      return Object.entries(cookies).map(([name, value]) => ({ name, value }))
    },

    /**
     * 
     * @param {string} name 
     * @param {string} value 
     * @param {CookieSerializeOptions} options 
     */
    set(name, value, options) {
      setInternal(name, value, { ...defaults, ...options })
    }
  }

  /**
   * 
   * @param {string} hostname 
   * @param {string} matcher 
   */
  function domainMatches(hostname, matcher) {
    if (!matcher) return true

    /**
     * Normalize the matcher domain, per https://datatracker.ietf.org/doc/html/rfc6265#section-5.2.3
     */
    const normalized = matcher[0] === '.' ? matcher.slice(1) : matcher

    /* Exact match. */
    if (hostname === normalized) return true

    /* Test by excluding subdomain(s). */
    return hostname.endsWith('.' + normalized)
  }

  /**
   * 
   * @param {string} path 
   * @param {string} matcher 
   */
  function pathMatches(path, matcher) {
    /**
     * Normalize the matcher path by removing any trailing slash.
     */
    const normalized = matcher.endsWith('/') ? matcher.slice(0, -1) : matcher

    /* Exact match. */
    if (path === normalized) return true

    /* Test by excluding URL hash property (#), which is percent-encoded and preserved for URL pathname. */
    return path.startsWith(normalized + '/')
  }

  function setInternal(name, value, options) {
    const path = options.path;

    // if (!options.domain || options.domain === url.hostname) {
    // 	path = resolve(normalized_url, path);
    // }

    new_cookies[name] = { name, value, options: { ...options, path } }
    console.log('setting cookies', new_cookies)
  }

  return  { cookies, new_cookies }
}

/**
 * 
 * @param {Request} request 
 * @returns 
 */
export const isFormContentType = (request) => {
  return isContentType(
    request,
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain'
  )
}

/* ATTR: SvelteKit */
/**
 * Given an Accept header and a list of possible content types,
 * pick the most suitable one to respond with.
 * @param {string} accept
 * @param {string[]} types
 */
export const negotiate = (accept, types) => {
	/** @type {Array<{ type: string, subtype: string, q: number, i: number }>} */
	const parts = []

	accept.split(',').forEach((str, i) => {
		const match = /([^/ \t]+)\/([^; \t]+)[ \t]*(?:;[ \t]*q=([0-9.]+))?/.exec(str);

		/* No match equals invalid header — ignore. */
		if (match) {
			const [, type, subtype, q = '1'] = match;
			parts.push({ type, subtype, q: +q, i });
		}
	})

	parts.sort((a, b) => {
		if (a.q !== b.q) {
			return b.q - a.q
		}

		if ((a.subtype === '*') !== (b.subtype === '*')) {
			return a.subtype === '*' ? 1 : -1
		}

		if ((a.type === '*') !== (b.type === '*')) {
			return a.type === '*' ? 1 : -1
		}

		return a.i - b.i
	})

	let accepted
	let min_priority = Infinity

	for (const mimetype of types) {
		const [type, subtype] = mimetype.split('/')
		const priority = parts.findIndex(
			(part) =>
				(part.type === type || part.type === '*') &&
				(part.subtype === subtype || part.subtype === '*')
		)

		if (priority !== -1 && priority < min_priority) {
			accepted = mimetype
			min_priority = priority
		}
	}

	return accepted
}

/* ATTR: SvelteKit */
/**
 * @param {number} status
 * @param {string} location
 */
export const redirectResponse = (status, location) => {
	const response = new Response(undefined, {
		status,
		headers: { location }
	})
	return response
}

/**
 * 
 * @type {ResolveEvent}
 */
export const resolve = async (event) => {
  /**
   * This check needs to stay here, so that any middleware
   * can potentially handle a requested endpoint before returning a 404.
   */
  if (!event.store) return new Response('Not Found', { status: 404 })

  const handler = event.store[event.request.method] ?? event.store['fallback']

  if (!handler)
    /* We found an endpoint, but the requested method is not configured. */
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': Object.keys(event.store).join(', ') /* Ensure we return the allowed methods for the endpoint, per RFC9110. */
      }
    })

  if (event.store.validators[event.request.method]) {
    const validators = Object.entries(event.store.validators[event.request.method])
    const content_type = event.request.headers.get('Content-Type')

    for (let i = 0; i < validators.length; i++) {
      const validator_type = validators[i][0]
      const v = validators[i][1]

      if ((validator_type === 'json' || validator_type === 'form') && (!content_type || !content_type.includes(validator_type)))
        throw new TypeError(`Expecting ${validator_type} content header, but received ${content_type}.`)

      if (validator_type === 'json') {
        const json_body = await event.request.json()

        event.valid.json = v(json_body)
      }
      
      if (validator_type === 'form') {
        const form_body = await event.request.formData()
        const form_values = {}

        for (const p of form_body.entries()) {
          form_values[p[0]] = p[1]
        }

        event.valid.form = v(form_values)
      }
      
      if (validator_type === 'query') {
        const query = event.url.searchParams
        const query_values = {}

        for (let [key, value] of query.entries()) {
          console.log('processing', key, value)
          query_values[key] = value
        }

        event.valid.query = v(query_values)
      }
    }
  }

  return await handler(event)
}
