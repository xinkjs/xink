/** @import { StandardSchemaV1 } from '../../types.js' */
import { Redirect } from './shared.js'

/**
 * 
 * @param {unknown} error
 * @returns {boolean}
 */
export const isSchemaError = (error) => {
  try {
    /** @type {StandardSchemaV1.Issue[]} */
    const issues = JSON.parse(error.message)
    const isArray = !!issues.length

    if (!isArray)
      return false

    for (let i = 0; i < issues.length; i++) {
      if (!issues[i].hasOwnProperty('message'))
        throw new Error()
    }

    return true
  } catch (err) {
    return false 
  }
}

const encoder = new TextEncoder()

/**
 * 
 * @param {any} data 
 * @param {ResponseInit} [init] 
 * @returns {Response}
 */
export const html = (data, init) => {
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', encoder.encode(data).byteLength.toString())

  if (!headers.has('content-type'))
    headers.set('content-type', 'text/html')

  return new Response(data, { ...init, headers })
}

/**
 * 
 * @param {any} data 
 * @param {ResponseInit} [init] 
 * @returns {Response}
 */
export const json = (data, init) => {
  const body = JSON.stringify(data)
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', encoder.encode(body).byteLength.toString())

  if (!headers.has('content-type'))
    headers.set('content-type', 'application/json')

  return new Response(body, { ...init, headers })
}

/* ATTR: SvelteKit */
/**
 * Redirect a request. When called during request handling, Xink will return a redirect response.
 * Make sure you're not catching the thrown redirect, which would prevent Xink from handling it.
 * @param {300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308} status The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#redirection_messages). Must be in the range 300-308.
 * @param {string | URL} location The location to redirect to.
 * @throws {Redirect} This error instructs Xink to redirect to the specified location.
 * @throws {Error} If the provided status is invalid.
 * @return {never}
 */
export function redirect(status, location) {
	if ((isNaN(status) || status < 300 || status > 308)) {
		throw new Error('Invalid status code')
	}

	throw new Redirect(
		status,
		location.toString()
	)
}

/**
 * 
 * @param {string} data 
 * @param {ResponseInit} [init] 
 * @returns {Response}
 */
export const text = (data, init) => {
  const body = encoder.encode(data)
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', body.byteLength.toString())

  if (!headers.has('content-type'))
    headers.set('content-type', 'text/plain')
  
  return new Response(body, { ...init, headers })
}
