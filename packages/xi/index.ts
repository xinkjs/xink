import type { 
  MatcherResult, 
  MixedResult, 
  ParsedSegment, 
  XiConfig, 
  Matcher, 
  StoreConstructor, 
  BaseStore 
} from "./types.js"
import { validateConfig } from './lib/config.js'

/**
 * Equivalent character class - /^[a-zA-Z0-9_]$/
 */
const wordMatcher: Matcher = (param) => /^\w+$/.test(param)
const letterMatcher: Matcher = (param) => /^[a-z]+$/i.test(param)
const numberMatcher: Matcher = (param) => /^\d+$/.test(param)

/**
 * Node in the routing trie
 */
export class Node<TStore> {
  /** Static child routes */
  static_children: Map<string, Node<TStore>> = new Map()
  
  /** Dynamic parameter child */
  dynamic_child: Node<TStore> | null = null
  
  /** Parameter name for dynamic routes */
  param_name: string | null = null
  
  /** Mixed static-dynamic children */
  mixed_children: Map<string, Node<TStore>> = new Map()

  /** Matcher children (:param=matcher) */
  matcher_children: Map<string, Node<TStore>> = new Map()
  
  /** Wildcard child (*param) */
  wildcard_child: Node<TStore> | null = null
  
  /** Store for method handlers */
  store: TStore | null = null
  
  /** Original route pattern */
  pattern: string | null = null
}

/**
 * Trie URL router 
 */
export abstract class Xi<TStore extends BaseStore> {
  protected abstract getStoreConstructor(): StoreConstructor<TStore>

  /** Root node of the routing trie */
  root: Node<TStore> = new Node<TStore>()
  
  /** @type Registry of matcher functions */
  matchers: Map<string, Matcher> = new Map([
    ['word', wordMatcher],
    ['letter', letterMatcher],
    ['number', numberMatcher]
  ])

  config: XiConfig

  constructor(options: Partial<XiConfig> = {}) {
    this.config = validateConfig(options)
  }

  /**
   * Get xi's config 
   */
  getConfig(): XiConfig { return this.config }

  /**
   * Find a route and return its info
   */
  find(path: string): { store: TStore | null, params: Record<string, string | undefined> } {
    if (!path.startsWith('/'))
      throw new Error('Path must start with /')

    const segments = path.split('/').filter(Boolean)

    return this.#matchRoute<TStore>(this.root, segments, 0, {})
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
  #matchMatcherSegment(pattern: string, segment: string): MatcherResult {
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
  #matchMixedSegment(pattern: string, segment: string): MixedResult {
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
  #matchRoute<TStore>(node: Node<TStore>, segments: string[], index: number, params: Record<string, string | undefined>): { store: TStore | null, params: Record<string, string | undefined> } {
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
      const result = this.#matchRoute<TStore>(
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

      const matcher_result = this.#matchMatcherSegment(pattern, segment)

      if (matcher_result.matches) {
        const new_params = { ...params }
        new_params[matcher_node.param_name] = matcher_result.param_value
        
        const result = this.#matchRoute<TStore>(
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

      const mixed_result = this.#matchMixedSegment(mixed_pattern, segment)

      if (mixed_result.matches) {
        const new_params = { ...params }
        new_params[mixed_node.param_name] = mixed_result.param_value
        
        const result = this.#matchRoute<TStore>(
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
      
      const result = this.#matchRoute<TStore>(
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
  #parseSegment(segment: string): ParsedSegment {
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
   * 
   * @throws Error, If path does not start with a '/'
   */
  route<Path extends string>(path: Path): TStore {
    if (!path.startsWith('/'))
      throw new Error('Path must start with /')

    const StoreClass = this.getStoreConstructor()

    const { base_path } = this.getConfig()
    const derived_path = base_path ? base_path + (path === '/' ? '' : path) : path

    const segments = derived_path.split('/').filter(Boolean)
    let current_node = this.root

    for (const segment of segments) {
      const parsed = this.#parseSegment(segment)
       
      switch (parsed.type) {
        case 'static':
          let static_node = current_node.static_children.get(segment)
          if (!static_node) {
            static_node = new Node<TStore>()
            current_node.static_children.set(segment, static_node)
          }

          current_node = static_node
          break
          
        case 'dynamic':
          if (!current_node.dynamic_child) {
            current_node.dynamic_child = new Node<TStore>()
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
            matcher_node = new Node<TStore>()
            matcher_node.param_name = parsed.param_name
            current_node.matcher_children.set(parsed.pattern, matcher_node)
          }
          current_node = matcher_node
          break
          
        case 'mixed':
          let mixed_node = current_node.mixed_children.get(parsed.pattern)
          if (!mixed_node) {
            mixed_node = new Node<TStore>()
            mixed_node.param_name = parsed.param_name
            current_node.mixed_children.set(parsed.pattern, mixed_node)
          }
          current_node = mixed_node
          break
          
        case 'wildcard':
          if (!current_node.wildcard_child) {
            current_node.wildcard_child = new Node<TStore>()
            current_node.param_name = parsed.param_name
          }

          current_node = current_node.wildcard_child
          break
      }
    }

    if (!current_node.store)
      current_node.store = new StoreClass()
    
    current_node.pattern = derived_path

    return current_node.store
  }
}
