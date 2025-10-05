import type { ResponseT } from "../../types.js"

export class StandardSchemaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    /** @type {string} */
    this.name = 'StandardSchemaError'
  }
}

const encoder = new TextEncoder()

/**
 * 
 * @param {any} data 
 * @param {ResponseInit} [init] 
 * @returns {Response}
 */
export const html = (data: any, init?: ResponseInit): Response => {
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', encoder.encode(data).byteLength.toString())

  if (!headers.has('content-type'))
    headers.set('content-type', 'text/html')

  return new Response(data, { ...init, headers })
}

export function json<T>(data: T, init?: ResponseInit): ResponseT<T> {
  const body = JSON.stringify(data)
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', encoder.encode(body).byteLength.toString())

  if (!headers.has('content-type'))
    headers.set('content-type', 'application/json')

  return new Response(body, { ...init, headers }) as ResponseT<T>
}

/* ATTR: SvelteKit */
export class Redirect {
  status
  location
	/**
	 * @param {300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308} status
	 * @param {string} location
	 */
	constructor(status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308, location: string) {
		this.status = status
		this.location = location
	}
}
/**
 * Redirect a request. When called during request handling, Xink will return a redirect response.
 * Make sure you're not catching the thrown redirect, which would prevent Xink from handling it.
 * @param {300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308} status The [HTTP status code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#redirection_messages). Must be in the range 300-308.
 * @param {string | URL} location The location to redirect to.
 * @throws {Redirect} This error instructs Xink to redirect to the specified location.
 * @throws {Error} If the provided status is invalid.
 * @return {never}
 */
export function redirect(status: 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308, location: string | URL): never {
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
export const text = (data: string, init?: ResponseInit): Response => {
  const body = encoder.encode(data)
  const headers = new Headers(init?.headers)

  if (!headers.has('content-length'))
    headers.set('content-length', body.byteLength.toString())

  if (!headers.has('content-type'))
    headers.set('content-type', 'text/plain')
  
  return new Response(body, { ...init, headers })
}
