import { parse, serialize, type ParseOptions, type SerializeOptions } from 'cookie'
import { inferObjectValueTypes, isContentType } from './utils.js'
import { DISALLOWED_METHODS } from '../constants.js'
import { StandardSchemaError, json, text, html } from './helpers.js'
import { isVNode, renderToString } from "./jsx.js"
import type { 
  Cookie,
  Cookies,
  HandlerMethod,
  HookMethod,
  ResolveEvent,
  StandardSchemaV1
} from '../../types.js'

/* ATTR: SvelteKit */
export const addCookiesToHeaders = (headers: Headers, cookies: Cookie[]) => {
  for (const new_cookie of cookies) {
    const { name, value, options } = new_cookie

    headers.append('set-cookie', serialize(name, value, options))
  }
}

/* ATTR: SvelteKit */
export const getCookies = (request: Request, url: URL) => {
  const header = request.headers.get('cookie') ?? ''
  const localhost = new Set(['localhost', '127.0.0.1', '::1'])
  const is_local = localhost.has(url.hostname)

  const defaults = {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: is_local && url.protocol === 'http:' ? false : true
  } as const

  const new_cookies: Record<string, Cookie> = {}
  const cookies: Cookies = {
    delete(name: string, options?: SerializeOptions) {
      cookies.set(name, '', { ...options, maxAge: 0 })
    },
    get(name: string, options?: ParseOptions) {
      const c = new_cookies[name]

      if (
        c &&
        domainMatches(url.hostname, c.options.domain || '') &&
        pathMatches(url.pathname, c.options.path || '')
      ) {
        return c.value
      }

      const decoder = options?.decode || decodeURIComponent
      const request_cookies = parse(header, { decode: decoder })
      const cookie = request_cookies[name]

      return cookie
    },
    getAll(options?: ParseOptions) {
      const decoder = options?.decode || decodeURIComponent
      const cookies = parse(header, { decode: decoder })

      for (const c of Object.values(new_cookies)) {
        if (
          domainMatches(url.hostname, c.options.domain || '') &&
          pathMatches(url.pathname, c.options.path || '')
        ) {
          cookies[c.name] = c.value
        }
      }

      return Object.entries(cookies).map(([name, value]) => ({ name, value: value || '' }))
    },
    set(name: string, value: string, options: SerializeOptions) {
      setInternal(name, value, { ...defaults, ...options })
    }
  }

  /**
   * 
   * @param {string} hostname 
   * @param {string} matcher 
   */
  function domainMatches(hostname: string, matcher: string) {
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
  function pathMatches(path: string, matcher: string) {
    /**
     * Normalize the matcher path by removing any trailing slash.
     */
    const normalized = matcher.endsWith('/') ? matcher.slice(0, -1) : matcher

    /* Exact match. */
    if (path === normalized) return true

    /* Test by excluding URL hash property (#), which is percent-encoded and preserved for URL pathname. */
    return path.startsWith(normalized + '/')
  }

  function setInternal(name: string, value: string, options: SerializeOptions) {
    const path = options.path;

    // if (!options.domain || options.domain === url.hostname) {
    // 	path = resolve(normalized_url, path);
    // }

    new_cookies[name] = { name, value, options: { ...options, path } }
  }

  return  { cookies, new_cookies }
}

/**
 * 
 * @param {Request} request 
 * @returns 
 */
export const isFormContentType = (request: Request) => {
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
export const negotiate = (accept: string, types: string[]) => {
  /** @type {Array<{ type: string, subtype: string, q: number, i: number }>} */
  const parts: Array<{ type: string; subtype: string; q: number; i: number }> = []

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
export const redirectResponse = (status: number, location: string) => {
  const response = new Response(undefined, {
    status,
    headers: { location }
  })
  return response
}

const processHandler = async (result: Response) => {
  if (isVNode(result)) {
    // Handle JSX VNode result
    return html(await renderToString(result))
  } else if (result instanceof Response) {
    return result
  } else if (typeof result === 'object' && result !== null) {
    // Handle plain objects -> JSON response
    return json(result)
  } else if (result !== undefined && result !== null) {
    // Handle strings, numbers, etc. -> Text response
    return text(String(result))
  } else {
    // Handle null/undefined result -> 204 No Content
    return new Response(null, { status: 204 })
  }
}

/**
 * 
 * @type {ResolveEvent}
 */
export const resolve: ResolveEvent = async (event) => {
  /**
   * This check needs to stay here, so that any middleware
   * can potentially handle a requested endpoint before returning a 404.
   */
  if (!event.store) return new Response('Not Found', { 
    status: 404,
    headers: {
      'x-xin-default-404': 'true'
    } 
  })

  const handler = event.store.getHandler(event.request.method as HandlerMethod) ?? event.store.getHandler('FALLBACK')

  if (!handler) {
    const methods = event.store.getMethods().filter((m) => !DISALLOWED_METHODS.has(m)).join(', ')

    /* We found an endpoint, but the requested method is not configured. */
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Allow': methods /* Ensure we return the allowed methods for the endpoint, per RFC9110. */
      }
    })
  }

  /**
   * Standard Schema Validator
   * 
   * @template {StandardSchemaV1} T
   * @param {T} schema 
   * @param {StandardSchemaV1.InferInput<T>} input 
   * @returns {Promise<StandardSchemaV1.InferOutput<T>>}
   */
  const validator = async <T extends StandardSchemaV1>(schema: T, input: StandardSchemaV1.InferInput<T>): Promise<StandardSchemaV1.InferOutput<T>> => {
    let result = schema['~standard'].validate(input)
    if (result instanceof Promise) result = await result

    if (result.issues) {
      throw new StandardSchemaError(
        JSON.stringify(
          result.issues.map((issue) => ({
            message: issue.message,
            path: issue.path
          }))
        )
      )
    }

    return result.value
  }

  const validation = async (schemas: Record<string, any>[]) => {
    const content_type = event.request.headers.get('Content-Type')

    for (let i = 0; i < schemas.length; i++) {
      const schema_type = schemas[i][0]
      const schema = schemas[i][1]

      if ((schema_type === 'json' || schema_type === 'form') && (!content_type || !content_type.includes(schema_type)))
        throw new TypeError(`Expecting ${schema_type} content header, but received ${content_type}.`)

      if (schema_type === 'json') {
        const clone = event.request.clone()
        const json_body = await clone.json()

        event.valid.json = await validator(schema, json_body)
        continue
      }
      
      if (schema_type === 'form') {
        const clone = event.request.clone()
        const form_body = await clone.formData()
        const form_values: Record<string, any> = {}

        for (const p of form_body.entries()) {
          form_values[p[0]] = p[1]
        }

        /* Apply type inference. */
        const inferred_form_data = inferObjectValueTypes(form_values)

        event.valid.form = await validator(schema, inferred_form_data)
        continue
      }

      if (schema_type === 'params') {
        /* Apply type inference. */
        const inferred_params = inferObjectValueTypes(event.params)

        event.valid.params = await validator(schema, inferred_params)
        continue
      }
      
      if (schema_type === 'query') {
        const query = event.url.searchParams
        const query_obj: Record<string, any> = {}

        for (let [key, value] of query) {
          query_obj[key] = value
        }

        /* Apply type inference. */
        const inferred_search_params = inferObjectValueTypes(query_obj)

        event.valid.query = await validator(schema, inferred_search_params)
        continue
      }
    }
  }

  const method = event.request.method
  const hooks = event.store.getHooks(method as HookMethod) ?? null
  const schemas = event.store.getSchema(method as HandlerMethod)

  if (schemas) await validation(Object.entries(schemas))

  if (hooks) {
    for (const [name, fn] of Object.entries(hooks)) {
      if (typeof fn !== 'function')
        continue

      /* Include try/catch here, so we can log any thrown error. */
      try {
        await fn(event)
      } catch (err) {
        console.log(err)
        throw err // rethrow, for handling by try/catch in index.js
      }
    }
  }

  return await processHandler(await handler(event) as Response)
}
