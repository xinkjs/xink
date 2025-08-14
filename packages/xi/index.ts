import type { INode, IStore, IRouter, BaseEvent, BasicRouteInfo, Handler, HandlerMethod, Hook, HookMethod, Matcher, MatcherResult, MixedResult, ParsedSegment, SchemaDefinition, StoreResult, XiConfig } from "./internal-types.js"
import { HANDLER_METHODS, HOOK_METHODS } from './constants.js'
import { validateConfig } from './config.js'

/**
 * Equivalent character class - /^[a-zA-Z0-9_]$/
 */
const wordMatcher: Matcher = (param) => /^\w+$/.test(param)

const letterMatcher: Matcher = (param) => /^[a-z]+$/i.test(param)
const numberMatcher: Matcher = (param) => /^\d+$/.test(param)

/**
 * Node in the routing trie
 */
class Node<TEvent extends BaseEvent = BaseEvent> implements INode<TEvent> {
  /** Static child routes */
  static_children: Map<string, Node<TEvent>> = new Map()
  
  /** Dynamic parameter child */
  dynamic_child: Node<TEvent> | null = null
  
  /** Parameter name for dynamic routes */
  param_name: string | null = null
  
  /** Mixed static-dynamic children */
  mixed_children: Map<string, Node<TEvent>> = new Map()

  /** Matcher children (:param=matcher) */
  matcher_children: Map<string, Node<TEvent>> = new Map()
  
  /** Wildcard child (*param) */
  wildcard_child: Node<TEvent> | null = null
  
  /** Store for method handlers */
  store: Store<string, TEvent> | null = null
  
  /** Original route pattern */
  pattern: string | null = null
}

/**
 * Store for a route's handlers and hooks
 */
export class Store<Path extends string = string, TEvent extends BaseEvent = BaseEvent> implements IStore<Path, TEvent> {
  /** Map of methods to handlers */
  handlers: Map<HandlerMethod, Handler<Path, TEvent, unknown, unknown>> = new Map()
  /** Map of methods to hooks */
  hooks: Map<HookMethod, Hook<Path, TEvent, unknown, unknown>[]> = new Map()
  schemas: Map<HandlerMethod, SchemaDefinition> = new Map()

  /**
   * Set handler for a method
   */
  setHandler<TSchema, ResSchema>(method: HandlerMethod, handler: Handler<Path, TEvent, TSchema, ResSchema>): void {
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
  getHandler(method: HandlerMethod): Handler<Path, TEvent, unknown, unknown> | undefined {
    return this.handlers.get(method)
  }

  /**
   * Set hooks for a method
   */
  setHooks<TSchema, ResSchema>(method: HookMethod, hooks: Hook<Path, TEvent, TSchema, ResSchema>[]) {
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
   * Get hooks for a method
   * 
   * @throws Error if you do not pass in a method
   */
  getHooks(method: HookMethod): Hook<Path, TEvent, unknown, unknown>[]|undefined {
    if (!method) throw new Error('getHooks requires a method to be passed in.')

    // hooks that apply to ALL methods should be run first, so put them at the front
    return [ ...(this.hooks.get('ALL') || []), ...(this.hooks.get(method) || []) ] 
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

  setSchema(method: HandlerMethod, schema: SchemaDefinition) {
    this.schemas.set(method, schema)
  }

  getSchemas(method: HandlerMethod): SchemaDefinition | undefined {
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

/**
 * Trie URL router 
 */
export class Xi<TEvent extends BaseEvent = BaseEvent> implements IRouter<TEvent>{
  /** Root node of the routing trie */
  root: Node<TEvent> = new Node<TEvent>()
  
  /** @type Registry of matcher functions */
  matchers: Map<string, Matcher> = new Map([
    ['word', wordMatcher],
    ['letter', letterMatcher],
    ['number', numberMatcher]
  ])

  config: XiConfig = {
    base_path: ''
  }

  constructor(options: Partial<XiConfig> = {}) {
    this.config = validateConfig(options)
  }

  /**
   * Set basepath for all registered routes
   */
  basepath(path: string) {
    if (typeof path !== 'string')
      throw new TypeError('Basepath must be a string.')
    if (path.charAt(0) !== '/')
      throw new Error('Basepath must start with a forward slash "/"')
    if (path.length === 1)
      throw new Error('Basepath cannot be "/"')

    this.config.base_path = path
  }

  /**
   * Get xi's config 
   */
  getConfig(): XiConfig { return this.config }

  /**
   * Find a route and return its info
   */
  find(path: string): StoreResult<TEvent> {
    if (!path.startsWith('/'))
      throw new Error('Path must start with /')

    const segments = path.split('/').filter(Boolean)

    return this.matchRoute(this.root, segments, 0, {})
  }

  /**
   * Return all registered routes with their methods and store
   */
  getRoutes(): BasicRouteInfo<TEvent> {
    const routes: BasicRouteInfo<TEvent> = []
    
    const traverse = (node: Node<TEvent>, path = '') => {
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
   * Add a matcher function
   * 
   * @throws Error, If Matcher is not a function
   */
  matcher(name: string, matcher: Matcher): void {
    if (typeof matcher !== 'function') {
      throw new Error('Matcher must be a function')
    }
    this.matchers.set(name, matcher)
  }

  /**
   * Match a URL segment against a matcher pattern
   */
  matchMatcherSegment(pattern: string, segment: string): MatcherResult {
    const match = pattern.match(/^(.+?)=([a-zA-Z]+?)$/)
    if (!match)
      return { matches: false }
    
    const matcher_name = match[2]
    const matcher = this.matchers.get(matcher_name)
    
    if (!matcher)
      return { matches: false }
    
    // Test the URL segment against the matcher function
    if (matcher(segment)) {
      return { 
        matches: true, 
        param_value: segment,
        matcher_name: matcher_name
      }
    }
    
    return { matches: false }
  }

  /**
   * Match a URL segment against a mixed pattern
   */
  matchMixedSegment(pattern: string, segment: string): MixedResult {
    const colon_index = pattern.indexOf(':')
    const static_part = pattern.slice(0, colon_index)
    
    if (segment.startsWith(static_part)) {
      const param_value = segment.slice(static_part.length)

      if (param_value.length > 0)
        return { matches: true, param_value }
    }
    
    return { matches: false }
  }

  /**
   * Recursively match route segments against the trie
   */
  matchRoute(node: Node<TEvent>, segments: string[], index: number, params: Record<string, string | undefined>): StoreResult<TEvent> {
    // If we've processed all segments and a store exists, return
    if ((index >= segments.length) && node.store) {
      return {
        store: node.store,
        params
      }
    }

    const segment = segments[index]
    const next_index = index + 1

    if (!segment) 
      return { store: null, params: {} }

    // Try static segment
    let static_child = node.static_children.get(segment)
    if (static_child) {
      const result = this.matchRoute(
        static_child,
        segments,
        next_index,
        params
      )

      if (result.store) return result
    }

    // Try matcher segment
    for (const [pattern, matcher_node] of node.matcher_children) {
      if (!matcher_node.param_name)
        continue

      const matcher_result = this.matchMatcherSegment(pattern, segment)

      if (matcher_result.matches) {
        const new_params = { ...params }
        new_params[matcher_node.param_name] = matcher_result.param_value
        
        const result = this.matchRoute(
          matcher_node,
          segments,
          next_index,
          new_params
        )
        if (result.store) return result
      }
    }

    // Try mixed segment
    for (const [mixed_pattern, mixed_node] of node.mixed_children) {
      if (!mixed_node.param_name)
        continue

      const mixed_result = this.matchMixedSegment(mixed_pattern, segment)

      if (mixed_result.matches) {
        const new_params = { ...params }
        new_params[mixed_node.param_name] = mixed_result.param_value
        
        const result = this.matchRoute(
          mixed_node,
          segments,
          next_index,
          new_params
        )
        if (result.store) return result
      }
    }

    // Try dynamic segment
    if (node.dynamic_child && node.param_name) {
      const new_params = { ...params }
      new_params[node.param_name] = segment
      
      const result = this.matchRoute(
        node.dynamic_child,
        segments,
        next_index,
        new_params
      )
      if (result.store) return result
    }

    // Try wildcard segment
    if (node.wildcard_child && node.wildcard_child.store && node.param_name) {
      const wild = segments.slice(index).join('/')
      const new_params = { ...params }
      new_params[node.param_name] = wild

      return { store: node.wildcard_child.store, params: new_params }
    }

    // No match found
    return { store: null, params: {} }
  }

  /**
   * Parse a route segment to determine its type and extract metadata
   */
  parseSegment(segment: string): ParsedSegment {
    if (segment.startsWith('*'))
      return { type: 'wildcard', param_name: segment.slice(1) }

    // Check for matcher segments like :fruits=fruit
    const matcher_segment = segment.match(/^:(.+?)=([a-zA-Z]+?)$/)
    if (matcher_segment) {
      return {
        type: 'matcher',
        param_name: matcher_segment[1],
        matcher_name: matcher_segment[2],
        pattern: segment
      }
    }
    
    if (segment.startsWith(':'))
      return { type: 'dynamic', param_name: segment.slice(1) }
    
    // Check for mixed segments like "hello-:name" or "user:id"
    const mixed_match = segment.match(/^(.+?)[:]([\w]+)$/)
    if (mixed_match) {
      return {
        type: 'mixed',
        static_part: mixed_match[1],
        param_name: mixed_match[2],
        pattern: segment
      }
    }
    
    return { type: 'static' }
  }

  /**
   * Register a route and return its store
   * @throws Error, If path does not start with a '/'
   */
  route<Path extends string>(path: Path): Store<Path, TEvent> {
    if (!path.startsWith('/'))
      throw new Error('Path must start with /')

    const { base_path } = this.getConfig()
    const derived_path = base_path ? base_path + (path === '/' ? '' : path) : path

    const segments = derived_path.split('/').filter(Boolean)
    let current_node = this.root

    for (const segment of segments) {
      const parsed = this.parseSegment(segment)
       
      switch (parsed.type) {
        case 'static':
          let static_node = current_node.static_children.get(segment)
          if (!static_node) {
            static_node = new Node<TEvent>()
            current_node.static_children.set(segment, static_node)
          }

          current_node = static_node
          break
          
        case 'dynamic':
          if (!current_node.dynamic_child) {
            current_node.dynamic_child = new Node<TEvent>()
            current_node.param_name = parsed.param_name
          }
          current_node = current_node.dynamic_child
          break
        
        case 'matcher':
          if (!this.matchers.has(parsed.matcher_name)) {
            throw new Error(`Unknown matcher: ${parsed.matcher_name}`)
          }
          
          let matcher_node = current_node.matcher_children.get(parsed.pattern)
          if (!matcher_node) {
            matcher_node = new Node<TEvent>()
            matcher_node.param_name = parsed.param_name
            current_node.matcher_children.set(parsed.pattern, matcher_node)
          }
          current_node = matcher_node
          break
          
        case 'mixed':
          let mixed_node = current_node.mixed_children.get(parsed.pattern)
          if (!mixed_node) {
            mixed_node = new Node<TEvent>()
            mixed_node.param_name = parsed.param_name
            current_node.mixed_children.set(parsed.pattern, mixed_node)
          }
          current_node = mixed_node
          break
          
        case 'wildcard':
          if (!current_node.wildcard_child) {
            current_node.wildcard_child = new Node<TEvent>()
            current_node.param_name = parsed.param_name
          }

          current_node = current_node.wildcard_child
          break
      }
    }

    if (!current_node.store)
      current_node.store = new Store()
    
    current_node.pattern = derived_path

    // Ensure return type matches signature, despite only being Store
    return current_node.store
  }

  /**
   * Merge one or more routers into this one.
   * 
   * Accepts a comma-separated list of routers.
   */
  router(...routers: Xi<TEvent>[]) {
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
  #mergeNodes(destination_node: Node<TEvent>, source_node: Node<TEvent>, base_path?: string): void {
    const path = base_path?.slice(1)
    let target_node: Node<TEvent>

    if (path) {
      let maybe_node = destination_node.static_children.get(path)
      if (maybe_node) {
        // child with path already exists
        target_node = maybe_node
      } else {
        // create child node and use that
        const new_node = new Node<TEvent>()
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
        target_node.store = new Store<string, TEvent>(); // Create a new Store if it doesn't exist
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
        destChildNode = new Node(); // Create if doesn't exist
        target_node.static_children.set(segment, destChildNode);
      }
      this.#mergeNodes(destChildNode, sourceChildNode);
    }

    // Merge Dynamic Child (only one per node)
    if (source_node.dynamic_child) {
      if (!target_node.dynamic_child) {
        target_node.dynamic_child = new Node();
        target_node.param_name = source_node.param_name; // Copy param name
      }
      this.#mergeNodes(target_node.dynamic_child, source_node.dynamic_child);
    }

    // Merge Matcher Children
    for (const [pattern, sourceChildNode] of source_node.matcher_children.entries()) {
      let destChildNode = target_node.matcher_children.get(pattern);
      if (!destChildNode) {
        destChildNode = new Node();
        destChildNode.param_name = sourceChildNode.param_name;
        target_node.matcher_children.set(pattern, destChildNode);
      }
      this.#mergeNodes(destChildNode, sourceChildNode);
    }

    // Merge Mixed Children
    for (const [pattern, sourceChildNode] of source_node.mixed_children.entries()) {
      let destChildNode = target_node.mixed_children.get(pattern);
      if (!destChildNode) {
        destChildNode = new Node();
        destChildNode.param_name = sourceChildNode.param_name;
        target_node.mixed_children.set(pattern, destChildNode);
      }
      this.#mergeNodes(destChildNode, sourceChildNode);
    }

    // Merge Wildcard Child (only one per node)
    if (source_node.wildcard_child) {
      if (!target_node.wildcard_child) {
        target_node.wildcard_child = new Node();
        target_node.param_name = source_node.param_name; // Copy param name if applicable
      }
      this.#mergeNodes(target_node.wildcard_child, source_node.wildcard_child);
    }
  }
}
