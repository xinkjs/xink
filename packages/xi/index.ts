import type { BaseEvent, BasicRouteInfo, Handler, HandlerMethod, Hook, HookMethod, Matcher, MatcherResult, MixedResult, ParsedSegment, StoreResult } from "./types"

/**
 * Equivalent character class - /^[a-zA-Z0-9_]$/
 */
const wordMatcher: Matcher = (param) => /^\w+$/.test(param)

const letterMatcher: Matcher = (param) => /^[a-z]+$/i.test(param)
const numberMatcher: Matcher = (param) => /^\d+$/.test(param)

const HANDLER_METHODS = new Set([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'FALLBACK'
])
const HOOK_METHODS = new Set([
  ...HANDLER_METHODS, 'ALL'
])

/**
 * Store for a route's handlers and hooks
 */
export class Store<Path extends string = string, TEvent extends BaseEvent = BaseEvent> {
  /** Map of methods to handlers */
  handlers: Map<HandlerMethod, Handler<Path, TEvent>> = new Map()
  /** Map of methods to hooks */
  hooks: Map<HookMethod, Hook<Path, TEvent>[]> = new Map()

  /**
   * Set handler for a method
   */
  setHandler(method: HandlerMethod, handler: Handler<Path, TEvent>): void {
    if (HANDLER_METHODS.has(method)) {
      this.handlers.set(method, handler)
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
  getHandler(method: HandlerMethod): Handler<Path, TEvent> | undefined {
    return this.handlers.get(method)
  }

  /**
   * Set hooks for a method
   */
  setHooks(method: HookMethod, hooks: Hook<Path, TEvent>[]) {
    if (HOOK_METHODS.has(method)) {
      this.hooks.set(method, hooks)
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
  getHooks(method: HookMethod): Hook<Path, TEvent>[]|undefined {   
    return this.hooks.get(method) 
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
   * Set hooks for all registered methods
   * 
   * Accepts a comma-separated list of hook functions.
   */
  hook(...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent> {
    if (hooks.length > 0)
      this.setHooks('ALL', hooks)
    
    return this
  }

  /**
   * Set a handler and hooks for the GET method
   */
  get(handler: Handler<Path, TEvent>, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent> {
    this.setHandler('GET', handler)
    if (hooks.length > 0) this.setHooks('GET', hooks)
    return this
  }

  /**
   * Set a handler and hooks for the POST method
   */
  post(handler: Handler, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent> {
    this.setHandler('POST', handler)
    if (hooks.length > 0) this.setHooks('POST', hooks)
    return this
  }

  /**
   * Set a handler and hooks for the PUT method
   */
  put(handler: Handler, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent> {
    this.setHandler('PUT', handler)
    if (hooks.length > 0) this.setHooks('PUT', hooks)
    return this
  }

  /**
   * Set a handler and hooks for the PATCH method
   */
  patch(handler: Handler, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent> {
    this.setHandler('PATCH', handler)
    if (hooks.length > 0) this.setHooks('PATCH', hooks)
    return this
  }

  /**
   * Set a handler and hooks for the DELETE method
   */
  delete(handler: Handler, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent> {
    this.setHandler('DELETE', handler)
    if (hooks.length > 0) this.setHooks('DELETE', hooks)
    return this
  }

  /**
   * Set a handler and hooks for the HEAD method
   */
  head(handler: Handler, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent> {
    this.setHandler('HEAD', handler)
    if (hooks.length > 0) this.setHooks('HEAD', hooks)
    return this
  }

  /**
   * Set a handler and hooks for the OPTIONS method
   */
  options(handler: Handler, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent> {
    this.setHandler('OPTIONS', handler)
    if (hooks.length > 0) this.setHooks('OPTIONS', hooks)
    return this
  }

  /**
   * Set a handler and hooks for all allowed
   * methods that are not already registered.
   */
  fallback(handler: Handler, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent> {
    this.setHandler('FALLBACK', handler)
    if (hooks.length > 0) this.setHooks('FALLBACK', hooks)
    return this
  }
}

/**
 * Node in the routing trie
 */
class Node {
  /** Static child routes */
  static_children: Map<string, Node> = new Map()
  
  /** Dynamic parameter child */
  dynamic_child: Node | null = null
  
  /** Parameter name for dynamic routes */
  param_name: string | null = null
  
  /** Mixed static-dynamic children */
  mixed_children: Map<string, Node> = new Map()

  /** Matcher children (:param=matcher) */
  matcher_children: Map<string, Node> = new Map()
  
  /** Wildcard child (*param) */
  wildcard_child: Node | null = null
  
  /** Store for method handlers */
  store: Store | null = null
  
  /** Original route pattern */
  pattern: string | null = null
}

/**
 * Trie URL router 
 */
export class Router<TEvent extends BaseEvent = BaseEvent> {
  /** Root node of the routing trie */
  root: Node = new Node()
  
  /** @type Registry of matcher functions */
  matchers: Map<string, Matcher> = new Map([
    ['word', wordMatcher],
    ['letter', letterMatcher],
    ['number', numberMatcher]
  ])

  base_path: string = ''

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

    this.base_path = path
  }

  /**
   * Find a route and return its info
   */
  find(path: string): StoreResult {
    if (!path.startsWith('/'))
      throw new Error('Path must start with /')

    const segments = path.split('/').filter(Boolean)

    return this.matchRoute(this.root, segments, 0, {})
  }

  /**
   * Return all registered routes with their methods
   */
  getRoutes(): BasicRouteInfo {
    const routes: BasicRouteInfo = []
    
    const traverse = (node: Node, path = '') => {
      if (node.store) {
        routes.push({ 
          pattern: node.pattern || '', 
          methods: node.store.getMethods() 
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
  matchRoute(node: Node, segments: string[], index: number, params: Record<string, string>): StoreResult {
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

    const derived_path = this.base_path ? this.base_path + (path === '/' ? '' : path) : path

    const segments = derived_path.split('/').filter(Boolean)
    let current_node = this.root

    for (const segment of segments) {
      const parsed = this.parseSegment(segment)
       
      switch (parsed.type) {
        case 'static':
          let static_node = current_node.static_children.get(segment)
          if (!static_node) {
            static_node = new Node()
            current_node.static_children.set(segment, static_node)
          }

          current_node = static_node
          break
          
        case 'dynamic':
          if (!current_node.dynamic_child) {
            current_node.dynamic_child = new Node()
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
            matcher_node = new Node()
            matcher_node.param_name = parsed.param_name
            current_node.matcher_children.set(parsed.pattern, matcher_node)
          }
          current_node = matcher_node
          break
          
        case 'mixed':
          let mixed_node = current_node.mixed_children.get(parsed.pattern)
          if (!mixed_node) {
            mixed_node = new Node()
            mixed_node.param_name = parsed.param_name
            current_node.mixed_children.set(parsed.pattern, mixed_node)
          }
          current_node = mixed_node
          break
          
        case 'wildcard':
          if (!current_node.wildcard_child) {
            current_node.wildcard_child = new Node()
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
    return current_node.store as unknown as Store<Path, TEvent>
  }
}
