import type { 
  ParsedSegment, 
  XiConfig, 
  Matcher, 
  StoreConstructor, 
  BaseStore 
} from "./types.js"
import { validateConfig } from './lib/config.js'

/**
 * Equivalent character class - /^[a-zA-Z0-9_]+$/
 */
const WORD_PATTERN = /^\w+$/
const LETTER_PATTERN = /^[a-z]+$/i
const NUMBER_PATTERN = /^\d+$/
const wordMatcher: Matcher = (param) => WORD_PATTERN.test(param)
const letterMatcher: Matcher = (param) => LETTER_PATTERN.test(param)
const numberMatcher: Matcher = (param) => NUMBER_PATTERN.test(param)

/**
 * Node in the routing trie
 */
export class Node<TStore> {
  /** Lazily allocated static child routes */
  static_children_map: Map<string, Node<TStore>> | null = null

  /** Static child routes */
  get static_children(): Map<string, Node<TStore>> {
    return this.static_children_map ??= new Map()
  }

  set static_children(children: Map<string, Node<TStore>>) {
    this.static_children_map = children
  }
  
  /** Dynamic parameter child */
  dynamic_child: Node<TStore> | null = null
  
  /** Parameter name for dynamic routes */
  param_name: string | null = null

  /** Parameter name for wildcard routes */
  wildcard_param_name: string | null = null

  /** Matcher name compiled from the incoming edge */
  matcher_name: string | null = null

  /** Static prefix compiled from a mixed incoming edge */
  static_part: string | null = null
  
  /** Mixed static-dynamic children */
  mixed_children_map: Map<string, Node<TStore>> | null = null

  get mixed_children(): Map<string, Node<TStore>> {
    return this.mixed_children_map ??= new Map()
  }

  set mixed_children(children: Map<string, Node<TStore>>) {
    this.mixed_children_map = children
  }

  /** Matcher children (:param=matcher) */
  matcher_children_map: Map<string, Node<TStore>> | null = null

  get matcher_children(): Map<string, Node<TStore>> {
    return this.matcher_children_map ??= new Map()
  }

  set matcher_children(children: Map<string, Node<TStore>>) {
    this.matcher_children_map = children
  }
  
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
    const params: Record<string, string | undefined> = {}
    const store = this.#matchRoute(this.root, segments, 0, params)

    return { store, params }
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
  #matchMatcherSegment(matcher_name: string, static_part: string | null, segment: string): string | null {
    if (static_part && !segment.startsWith(static_part))
      return null

    const param_value = static_part ? segment.slice(static_part.length) : segment
    if (!param_value)
      return null

    const matcher = this.matchers.get(matcher_name)
    
    if (!matcher)
      return null
    
    return matcher(param_value) ? param_value : null
  }

  /**
   * Match a URL segment against a mixed pattern
   */
  #matchMixedSegment(static_part: string, segment: string): string | null {
    if (segment.startsWith(static_part)) {
      const param_value = segment.slice(static_part.length)

      if (param_value.length > 0)
        return param_value
    }
    
    return null
  }

  /**
   * Recursively match route segments against the trie
   */
  #matchRoute(node: Node<TStore>, segments: string[], index: number, params: Record<string, string | undefined>): TStore | null {
    // If we've processed all segments and a store exists, return
    if ((index >= segments.length) && node.store) {
      return node.store
    }

    if (index >= segments.length && node.wildcard_child?.store && node.wildcard_param_name) {
      params[node.wildcard_param_name] = ''
      return node.wildcard_child.store
    }

    const segment = segments[index]
    const next_index = index + 1

    if (!segment) 
      return null

    // Try static segment
    let static_child = node.static_children_map?.get(segment)
    if (static_child) {
      const result = this.#matchRoute(
        static_child,
        segments,
        next_index,
        params
      )

      if (result) return result
    }

    // Try matcher segment
    const matcher_children = node.matcher_children_map
    if (matcher_children) {
      for (const matcher_node of matcher_children.values()) {
        if (!matcher_node.param_name || !matcher_node.matcher_name)
          continue

        const param_value = this.#matchMatcherSegment(
          matcher_node.matcher_name,
          matcher_node.static_part,
          segment
        )

        if (param_value !== null) {
          const previous_value = params[matcher_node.param_name]
          params[matcher_node.param_name] = param_value

          const result = this.#matchRoute(
            matcher_node,
            segments,
            next_index,
            params
          )
          if (result) return result
          if (previous_value === undefined)
            delete params[matcher_node.param_name]
          else
            params[matcher_node.param_name] = previous_value
        }
      }
    }

    // Try mixed segment
    const mixed_children = node.mixed_children_map
    if (mixed_children) {
      for (const mixed_node of mixed_children.values()) {
        if (!mixed_node.param_name || mixed_node.static_part === null)
          continue

        const param_value = this.#matchMixedSegment(mixed_node.static_part, segment)

        if (param_value !== null) {
          const previous_value = params[mixed_node.param_name]
          params[mixed_node.param_name] = param_value

          const result = this.#matchRoute(
            mixed_node,
            segments,
            next_index,
            params
          )
          if (result) return result
          if (previous_value === undefined)
            delete params[mixed_node.param_name]
          else
            params[mixed_node.param_name] = previous_value
        }
      }
    }

    // Try dynamic segment
    if (node.dynamic_child && node.param_name) {
      const previous_value = params[node.param_name]
      params[node.param_name] = segment
      
      const result = this.#matchRoute(
        node.dynamic_child,
        segments,
        next_index,
        params
      )
      if (result) return result
      if (previous_value === undefined)
        delete params[node.param_name]
      else
        params[node.param_name] = previous_value
    }

    // Try wildcard segment
    if (node.wildcard_child && node.wildcard_child.store && node.wildcard_param_name) {
      const wild = `/${segments.slice(index).join('/')}`
      params[node.wildcard_param_name] = wild
      return node.wildcard_child.store
    }

    // No match found
    return null
  }

  /**
   * Parse a route segment to determine its type and extract metadata
   */
  #parseSegment(segment: string): ParsedSegment {
    if (segment.startsWith('*')) {
      const param_name = segment.slice(1)
      if (!/^\w+$/.test(param_name))
        throw new Error(`Invalid parameter name: ${param_name}`)
      return { type: 'wildcard', param_name }
    }

    // Check for matcher segments like :fruits=fruit
    const matcher_segment = segment.match(/^:(\w+)=(\w+)$/)
    if (matcher_segment) {
      return {
        type: 'matcher',
        param_name: matcher_segment[1],
        matcher_name: matcher_segment[2],
        pattern: segment
      }
    }
    
    if (segment.startsWith(':')) {
      const param_name = segment.slice(1)
      if (!/^\w+$/.test(param_name))
        throw new Error(`Invalid parameter name: ${param_name}`)
      return { type: 'dynamic', param_name }
    }

    const mixed_matcher = segment.match(/^(.+?):(\w+)=(\w+)$/)
    if (mixed_matcher) {
      return {
        type: 'mixed_matcher',
        static_part: mixed_matcher[1],
        param_name: mixed_matcher[2],
        matcher_name: mixed_matcher[3],
        pattern: segment
      }
    }
    
    // Check for mixed segments like "hello-:name" or "user:id"
    const mixed_match = segment.match(/^(.+?):(\w+)$/)
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

    for (const [index, segment] of segments.entries()) {
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
          } else if (current_node.param_name !== parsed.param_name) {
            throw new Error(`Conflicting parameter names: ${current_node.param_name} and ${parsed.param_name}`)
          }
          current_node = current_node.dynamic_child
          break
        
        case 'matcher':
          if (!this.matchers.has(parsed.matcher_name)) {
            throw new Error(`Unknown matcher: ${parsed.matcher_name}`)
          }

          for (const child of current_node.matcher_children.values()) {
            if (child.matcher_name === parsed.matcher_name && child.static_part === null &&
              child.param_name !== parsed.param_name) {
              throw new Error(`Conflicting parameter names: ${child.param_name} and ${parsed.param_name}`)
            }
          }
          
          let matcher_node = current_node.matcher_children.get(parsed.pattern)
          if (!matcher_node) {
            matcher_node = new Node<TStore>()
            matcher_node.param_name = parsed.param_name
            matcher_node.matcher_name = parsed.matcher_name
            current_node.matcher_children.set(parsed.pattern, matcher_node)
          }
          current_node = matcher_node
          break

        case 'mixed_matcher':
          if (!this.matchers.has(parsed.matcher_name)) {
            throw new Error(`Unknown matcher: ${parsed.matcher_name}`)
          }

          for (const child of current_node.matcher_children.values()) {
            if (child.matcher_name === parsed.matcher_name && child.static_part === parsed.static_part &&
              child.param_name !== parsed.param_name) {
              throw new Error(`Conflicting parameter names: ${child.param_name} and ${parsed.param_name}`)
            }
          }

          let mixed_matcher_node = current_node.matcher_children.get(parsed.pattern)
          if (!mixed_matcher_node) {
            mixed_matcher_node = new Node<TStore>()
            mixed_matcher_node.param_name = parsed.param_name
            mixed_matcher_node.matcher_name = parsed.matcher_name
            mixed_matcher_node.static_part = parsed.static_part
            current_node.matcher_children.set(parsed.pattern, mixed_matcher_node)
          }
          current_node = mixed_matcher_node
          break
          
        case 'mixed':
          for (const child of current_node.mixed_children.values()) {
            if (child.static_part === parsed.static_part && child.param_name !== parsed.param_name) {
              throw new Error(`Conflicting parameter names: ${child.param_name} and ${parsed.param_name}`)
            }
          }

          let mixed_node = current_node.mixed_children.get(parsed.pattern)
          if (!mixed_node) {
            mixed_node = new Node<TStore>()
            mixed_node.param_name = parsed.param_name
            mixed_node.static_part = parsed.static_part
            current_node.mixed_children.set(parsed.pattern, mixed_node)
          }
          current_node = mixed_node
          break
          
        case 'wildcard':
          if (index !== segments.length - 1)
            throw new Error('Wildcard parameters must be the final route segment')

          if (!current_node.wildcard_child) {
            current_node.wildcard_child = new Node<TStore>()
            current_node.wildcard_param_name = parsed.param_name
            if (!current_node.dynamic_child)
              current_node.param_name = parsed.param_name
          } else if (current_node.wildcard_param_name !== parsed.param_name) {
            throw new Error(`Conflicting parameter names: ${current_node.wildcard_param_name} and ${parsed.param_name}`)
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
