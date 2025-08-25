import { Xi, Node, type BaseStore, type StoreConstructor } from "@xinkjs/xi"
import { sequence } from "./lib/runtime/utils.js"
import { validateConfig } from "./lib/config.js"
import { addCookiesToHeaders, getCookies, isFormContentType, redirectResponse, resolve } from "./lib/runtime/fetch.js"
import { json, text, html, redirect, Redirect } from './lib/runtime/helpers.js'
import { openapi_template } from "./lib/runtime/openapi.js"
import type { Cookie, ErrorHandler, Handle, Hook, NotFoundHandler, OpenApiConfig, OpenApiData, OpenApiOptions, XinConfig } from "./types.js"
import type { BaseEvent, BasicRouteInfo, Handler, HandlerMethod, HookMethod, SchemaDefinition } from "./internal-types.js"
import { HANDLER_METHODS, HOOK_METHODS } from "./lib/constants.js"

class Store<Path extends string = string, TEvent extends BaseEvent = BaseEvent> implements BaseStore {
  /** Map of methods to handlers */
  handlers: Map<HandlerMethod, unknown> = new Map()
  /** Map of methods to hooks */
  hooks: Map<HookMethod, Hook<Path, TEvent, unknown, unknown>[]> = new Map()
  schemas: Map<HandlerMethod, SchemaDefinition> = new Map()

  /**
   * Set handler for a method
   */
  setHandler(method: HandlerMethod, handler: unknown): void {
    if (HANDLER_METHODS.has(method)) {
      this.handlers.set(method, handler as any)
    } else {
      const is_uppercase = method === method.toUpperCase()
      if (is_uppercase)
        throw Error(`Method ${method} not allowed.`)
      else
        throw Error(`Method ${method} is invalid; it should be UPPERCASE.`)
    }
  }

  /**
   * Get handler for a method
   */
  getHandler(method: HandlerMethod): unknown | undefined {
    return this.handlers.get(method)
  }

  /**
   * Get all registered methods
   */
  getMethods(): string[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * Check if a method is registered
   */
  hasMethod(method: string): boolean {
    return this.handlers.has(method.toUpperCase() as HandlerMethod)
  }

  /**
   * Set hooks for a method
   */
  setHooks(method: HookMethod, hooks: unknown[]) {
    if (HOOK_METHODS.has(method)) {
      this.hooks.set(method, hooks as any)
    } else {
      const is_uppercase = method === method.toUpperCase()
      if (is_uppercase)
        throw Error(`Method ${method} not allowed.`)
      else
        throw Error(`Method ${method} is invalid; it should be UPPERCASE.`)
    }
  }

  /**
   * Get hooks for a method, including any route hooks.
   * 
   * @throws Error if you do not pass in a method
   */
  getHooks(method: HookMethod): Hook<Path, TEvent, unknown, unknown>[]|undefined {
    if (!method) throw new Error('getHooks requires a method to be passed in.')

    // hooks that apply to ALL methods should be run first, so put them at the front
    return [ ...(this.hooks.get('ALL') || []), ...(this.hooks.get(method) || []) ] 
  }

  setSchema(method: HandlerMethod, schema: SchemaDefinition) {
    this.schemas.set(method, schema)
  }

  getSchema(method: HandlerMethod): SchemaDefinition | undefined {
    return this.schemas.get(method)
  }

  /**
   * Set hooks for all registered methods
   * 
   * Accepts a comma-separated list of hook functions.
   */
  hook<TSchema, ResSchema>(...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent> {
    if (hooks.length > 0)
      this.setHooks('ALL', hooks)
    
    return this
  }

  #method<TSchema = unknown, ResSchema = unknown>(
    method: HandlerMethod,
    handler: Handler<Path, TEvent, TSchema, ResSchema>,
    hooks: Hook<Path, TEvent, TSchema, ResSchema>[],
    schema?: SchemaDefinition
  ) {
    this.setHandler(method, handler)
    if (hooks.length > 0) this.setHooks(method, hooks)
    if (schema) this.setSchema(method, schema)
  }

  #getArgs<TSchema = unknown, ResSchema = unknown>(
    arg1: SchemaDefinition | Handler<Path, TEvent, TSchema, ResSchema>, // Arg1 can be schema or handler
    arg2?: Handler<Path, TEvent, TSchema, ResSchema> | Hook<Path, TEvent, TSchema, ResSchema>, // Arg2 is handler or first hook
    rest?: Hook<Path, TEvent, TSchema, ResSchema>[]
  ) {
    let handler: Handler<Path, TEvent, TSchema, ResSchema>
    let hooks: Hook<Path, TEvent, TSchema, ResSchema>[] = []
    let schema: SchemaDefinition | undefined

    if (typeof arg1 === 'object' && arg1 !== null && typeof arg1 !== 'function') {
      // schema was passed
      schema = arg1 as SchemaDefinition
      handler = arg2 as Handler<Path, TEvent, TSchema, ResSchema>
      if (rest) hooks = rest
    } else {
      // schema was not passed
      handler = arg1 as Handler<Path, TEvent, TSchema, ResSchema>
      if (arg2) hooks.push(arg2 as Hook<Path, TEvent, TSchema, ResSchema>)
      if (rest) hooks.push(...rest)
    }

    return { handler, hooks, schema }
  }

  /**
   * Set a handler and hooks for the GET method
   */
  get<TSchema = unknown, ResSchema = unknown>(
    arg1: SchemaDefinition | Handler<Path, TEvent, TSchema, ResSchema>, // Arg1 can be schema or handler
    arg2?: Handler<Path, TEvent, TSchema, ResSchema> | Hook<Path, TEvent, TSchema, ResSchema>, // Arg2 is handler or first hook
    ...rest: Hook<Path, TEvent, TSchema, ResSchema>[]
  ): Store<Path, TEvent> {
    const { handler, hooks, schema } = this.#getArgs(arg1, arg2, rest)

    this.#method('GET', handler, hooks, schema)
    return this
  }

  /**
   * Set a handler and hooks for the POST method
   */
  post<TSchema = unknown, ResSchema = unknown>(
    arg1: SchemaDefinition | Handler<Path, TEvent, TSchema, ResSchema>, // Arg1 can be schema or handler
    arg2?: Handler<Path, TEvent, TSchema, ResSchema> | Hook<Path, TEvent, TSchema, ResSchema>, // Arg2 is handler or first hook
    ...rest: Hook<Path, TEvent, TSchema, ResSchema>[]
  ): Store<Path, TEvent> {
    const { handler, hooks, schema } = this.#getArgs(arg1, arg2, rest)

    this.#method('POST', handler, hooks, schema)
    return this
  }

  /**
   * Set a handler and hooks for the PUT method
   */
  put<TSchema = unknown, ResSchema = unknown>(
    arg1: SchemaDefinition | Handler<Path, TEvent, TSchema, ResSchema>, // Arg1 can be schema or handler
    arg2?: Handler<Path, TEvent, TSchema, ResSchema> | Hook<Path, TEvent, TSchema, ResSchema>, // Arg2 is handler or first hook
    ...rest: Hook<Path, TEvent, TSchema, ResSchema>[]
  ): Store<Path, TEvent> {
    const { handler, hooks, schema } = this.#getArgs(arg1, arg2, rest)

    this.#method('PUT', handler, hooks, schema)
    return this
  }

  /**
   * Set a handler and hooks for the PATCH method
   */
  patch<TSchema = unknown, ResSchema = unknown>(
    arg1: SchemaDefinition | Handler<Path, TEvent, TSchema, ResSchema>, // Arg1 can be schema or handler
    arg2?: Handler<Path, TEvent, TSchema, ResSchema> | Hook<Path, TEvent, TSchema, ResSchema>, // Arg2 is handler or first hook
    ...rest: Hook<Path, TEvent, TSchema, ResSchema>[]
  ): Store<Path, TEvent> {
    const { handler, hooks, schema } = this.#getArgs(arg1, arg2, rest)

    this.#method('PATCH', handler, hooks, schema)
    return this
  }

  /**
   * Set a handler and hooks for the DELETE method
   */
  delete<TSchema = unknown, ResSchema = unknown>(
    arg1: SchemaDefinition | Handler<Path, TEvent, TSchema, ResSchema>, // Arg1 can be schema or handler
    arg2?: Handler<Path, TEvent, TSchema, ResSchema> | Hook<Path, TEvent, TSchema, ResSchema>, // Arg2 is handler or first hook
    ...rest: Hook<Path, TEvent, TSchema, ResSchema>[]
  ): Store<Path, TEvent> {
    const { handler, hooks, schema } = this.#getArgs(arg1, arg2, rest)

    this.#method('DELETE', handler, hooks, schema)
    return this
  }

  /**
   * Set a handler and hooks for the HEAD method
   */
  head<TSchema = unknown, ResSchema = unknown>(
    arg1: SchemaDefinition | Handler<Path, TEvent, TSchema, ResSchema>, // Arg1 can be schema or handler
    arg2?: Handler<Path, TEvent, TSchema, ResSchema> | Hook<Path, TEvent, TSchema, ResSchema>, // Arg2 is handler or first hook
    ...rest: Hook<Path, TEvent, TSchema, ResSchema>[]
  ): Store<Path, TEvent> {
    const { handler, hooks, schema } = this.#getArgs(arg1, arg2, rest)

    this.#method('HEAD', handler, hooks, schema)
    return this
  }

  /**
   * Set a handler and hooks for the OPTIONS method
   */
  options<TSchema = unknown, ResSchema = unknown>(
    arg1: SchemaDefinition | Handler<Path, TEvent, TSchema, ResSchema>, // Arg1 can be schema or handler
    arg2?: Handler<Path, TEvent, TSchema, ResSchema> | Hook<Path, TEvent, TSchema, ResSchema>, // Arg2 is handler or first hook
    ...rest: Hook<Path, TEvent, TSchema, ResSchema>[]
  ): Store<Path, TEvent> {
    const { handler, hooks, schema } = this.#getArgs(arg1, arg2, rest)

    this.#method('OPTIONS', handler, hooks, schema)
    return this
  }

  /**
   * Set a handler and hooks for all allowed
   * methods that are not already registered.
   */
  fallback<TSchema = unknown, ResSchema = unknown>(
    arg1: SchemaDefinition | Handler<Path, TEvent, TSchema, ResSchema>, // Arg1 can be schema or handler
    arg2?: Handler<Path, TEvent, TSchema, ResSchema> | Hook<Path, TEvent, TSchema, ResSchema>, // Arg2 is handler or first hook
    ...rest: Hook<Path, TEvent, TSchema, ResSchema>[]
  ): Store<Path, TEvent> {
    const { handler, hooks, schema } = this.#getArgs(arg1, arg2, rest)

    this.#method('FALLBACK', handler, hooks, schema)
    return this
  }
}

export class Xin extends Xi<Store> {
  protected getStoreConstructor(): StoreConstructor<Store> {
    return Store
  }
  notFoundHandler: NotFoundHandler | undefined
  errorHandler: ErrorHandler | undefined
  middleware: Handle[] = []
  #openapi: OpenApiConfig = {
    path: '',
    paths: {},
    metadata: { 
      openapi: "3.1.0"
    },
    scalar: {}
  }
  #config: XinConfig

  constructor(options: Partial<XinConfig> = {}) {
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
  async fetch(request: Request, env: Record<string, any> = {}, ctx: Record<string, any> = {}): Promise<Response> { // must not be an arrow function!!
    const url = new URL(request.url)
    const { store, params } = this.find(url.pathname)
    const middleware = this.middleware
    const handle = sequence(...middleware)
    const errorHandler = this.errorHandler
    const notFoundHandler = this.notFoundHandler
    /** @type {Record<string, Cookie>} */
    let cookies_to_add: Record<string, Cookie> ={}
    /** @type {Record<string, string>} */
    const headers: Record<string, string> = {}

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
      setHeaders: (new_headers: Record<string, any>) => {
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
        response = await notFoundHandler(event)

      /* ATTR: SvelteKit */
      /* Respond with 304 if etag matches. */
      if (response.headers.has('etag') && response.status === 200) {
        let if_none_match_value = request.headers.get('if-none-match');

        /* Ignore W/ prefix https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match#directives */
        if (if_none_match_value?.startsWith('W/"')) {
          if_none_match_value = if_none_match_value.substring(2);
        }

        const etag = response.headers.get('etag') || undefined;

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
    } catch (err: any) {
      /* ATTR: SvelteKit */
      if (err instanceof Redirect) {
        const response = redirectResponse(err.status, err.location)
        addCookiesToHeaders(response.headers, Object.values(cookies_to_add))

        return response
      }

      /* Allow dev to handle error. */
      if (errorHandler) {
        const response = await errorHandler(err, event)
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
   * Return all registered routes with their methods and store
   */
  getRoutes(): BasicRouteInfo {
    const routes: BasicRouteInfo = []
    
    const traverse = (node: Node<Store>, path = '') => {
      if (node.store) {
        routes.push({ 
          pattern: node.pattern || '',
          methods: node.store.getMethods(),
          store: node.store
        })
      }
      
      for (const [segment, child] of node.static_children)
        traverse(child, `${path}/${segment}`)
      
      if (node.dynamic_child)
        traverse(node.dynamic_child, `${path}/:${node.param_name}`)

      for (const [pattern, child] of node.matcher_children) {
        traverse(child, `${path}/${pattern}`)
      }
      
      for (const [pattern, child] of node.mixed_children)
        traverse(child, `${path}/${pattern}`)
      
      if (node.wildcard_child)
        traverse(node.wildcard_child, `${path}/*`)
    }
    
    traverse(this.root)
    return routes
  }

  /**
   * Gets all middleware
   * 
   * @returns {Handle[]}
   */
  getMiddleware(): Handle[] {
    return this.middleware
  }

  /**
   * 
   * @param {ErrorHandler} handler 
   */
  onError(handler: ErrorHandler) {
    this.errorHandler = handler
  }

  /**
   * 
   * @param {NotFoundHandler} handler 
   */
  onNotFound(handler: NotFoundHandler) {
    this.notFoundHandler = handler
  }

  /** Set openapi data and Scalar options */
  openapi({ path, metadata, scalar }: OpenApiOptions) {
    this.#openapi.path = path
    if (metadata)
      /* Merge provided metadata with existing (paths are built during init). */
      this.#openapi.metadata = {
        ...(this.#openapi.metadata),
        ...metadata,
      }

    if (scalar) this.#openapi.scalar = scalar
  }

  route(path: string, openapi?: OpenApiData) {
    const store = super.route(path)
    /** @type {Record<string, any>} */
    const openapi_schema: Record<string, any> = {}
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
  use(...middleware: Handle[]) {
    this.middleware.push(...middleware)
  }

  /**
   * Merge one or more routers into this one.
   * 
   * Accepts a comma-separated list of routers.
   */
  router(...routers: Xin[]) {
    const { base_path } = this.getConfig()
    routers.forEach(router => this.#mergeNodes(this.root, router.root, base_path))
  }

  /**
   * Recursively merges nodes from a source trie into a destination trie.
   * 
   * @param destination_node The current node in the target router's trie.
   * @param source_node The current node in the source router's trie.
   * @param base_path The base_path of the target node.
   */
  #mergeNodes(destination_node: Node<Store>, source_node: Node<Store>, base_path?: string): void {
    const path = base_path?.slice(1)
    let target_node: Node<Store>

    if (path) {
      let maybe_node = destination_node.static_children.get(path)
      if (maybe_node) {
        // child with path already exists
        target_node = maybe_node
      } else {
        // create child node and use that
        const new_node = new Node<Store>()
        destination_node.static_children.set(path, new_node)
        target_node = new_node
      }
    } else {
      // just use passed-in node
      target_node = destination_node
    }

    // 1. Copy handler/store if it exists on the source node
    //    If the dest node already has a store, this will overwrite it.
    //    You might want a more sophisticated merge (e.g., merge handlers by method).
    if (source_node.store) {
      // If target_node already has a store, merge its handlers/hooks by method.
      // Otherwise, just copy the source store.
      if (!target_node.store) {
        target_node.store = new Store(); // Create a new Store if it doesn't exist
      }
      // Iterate over methods in the source store and set them in the dest store.
      // This ensures method-specific handlers/hooks/schemas are copied.
      for (const [method, handler] of source_node.store.handlers.entries()) {
        target_node.store.setHandler(method, handler);
      }
      for (const [method, hooks] of source_node.store.hooks.entries()) {
        target_node.store.setHooks(method, hooks);
      }
      for (const [method, schema] of source_node.store.schemas.entries()) {
        target_node.store.setSchema(method, schema);
      }
      // Handle the .hook() global hooks on the store if they are there.
      const source_global_hooks = source_node.store.getHooks('ALL');
      if (source_global_hooks && source_global_hooks.length > 0) {
        target_node.store.setHooks('ALL', source_global_hooks); // Or merge existing ones
      }
    }

    // 2. Recursively merge children (static, dynamic, matcher, mixed, wildcard)

    // Merge Static Children
    for (const [segment, sourceChildNode] of source_node.static_children.entries()) {
      let destChildNode = target_node.static_children.get(segment);
      if (!destChildNode) {
        destChildNode = new Node<Store>(); // Create if doesn't exist
        target_node.static_children.set(segment, destChildNode);
      }
      this.#mergeNodes(destChildNode, sourceChildNode);
    }

    // Merge Dynamic Child (only one per node)
    if (source_node.dynamic_child) {
      if (!target_node.dynamic_child) {
        target_node.dynamic_child = new Node<Store>();
        target_node.param_name = source_node.param_name; // Copy param name
      }
      this.#mergeNodes(target_node.dynamic_child, source_node.dynamic_child);
    }

    // Merge Matcher Children
    for (const [pattern, sourceChildNode] of source_node.matcher_children.entries()) {
      let destChildNode = target_node.matcher_children.get(pattern);
      if (!destChildNode) {
        destChildNode = new Node<Store>();
        destChildNode.param_name = sourceChildNode.param_name;
        target_node.matcher_children.set(pattern, destChildNode);
      }
      this.#mergeNodes(destChildNode, sourceChildNode);
    }

    // Merge Mixed Children
    for (const [pattern, sourceChildNode] of source_node.mixed_children.entries()) {
      let destChildNode = target_node.mixed_children.get(pattern);
      if (!destChildNode) {
        destChildNode = new Node<Store>();
        destChildNode.param_name = sourceChildNode.param_name;
        target_node.mixed_children.set(pattern, destChildNode);
      }
      this.#mergeNodes(destChildNode, sourceChildNode);
    }

    // Merge Wildcard Child (only one per node)
    if (source_node.wildcard_child) {
      if (!target_node.wildcard_child) {
        target_node.wildcard_child = new Node<Store>();
        target_node.param_name = source_node.param_name; // Copy param name if applicable
      }
      this.#mergeNodes(target_node.wildcard_child, source_node.wildcard_child);
    }
  }
}
