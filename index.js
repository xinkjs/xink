/** @import { Handler, Matcher, MatcherFn, MatcherType, Node, Params, ParametricNode, Route, Router, Store, StoreFactory } from './types.js' */

/**
 * 
 * @param {string} segment 
 * @param {Node[]} [static_children] 
 * @returns {Node}
 */
const createNode = (segment, static_children) => {
  return {
    segment,
    store: null,
    static_children: static_children === undefined
      ? null
      : new Map(static_children.map(child => [child.segment.charCodeAt(0), child])),
    parametric_children: null,
    wildcard_store: null
  }
}

/**
 * 
 * @param {Node} node 
 * @param {string} new_segment 
 * @returns {Node}
 */
const cloneNode = (node, new_segment) => {
  return {
    segment: new_segment,
    store: node.store,
    static_children: node.static_children,
    parametric_children: node.parametric_children,
    wildcard_store: node.wildcard_store,
  }
}

/**
 * 
 * @param {string} param_name 
 * @param {Matcher} matcher 
 * @param {MatcherType} matcher_type 
 * @returns {ParametricNode}
 */
const createParametricNode = (param_name, matcher = null, matcher_type = null) => {
  return {
    matcher,
    matcher_type,
    param_name,
    store: null,
    static_child: null,
  }
}

/**
 * 
 * @returns {Store}
 */
const defaultStoreFactory = () => {
  return Object.create(null)
}

/**
 * 
 * @param {Map<string, ParametricNode>} data 
 * @returns {Map<string, ParametricNode>}
 */
const sortMap = (data) => {
  return new Map([...data].sort((a, b) => {
    const f = a[1].matcher_type
    const s = b[1].matcher_type

    if (f === s) return 0
    if (f === null) return 1 /* a should come before b */
    if (s === null) return -1 /* b should come before a */
    return f < s ? 1 : -1 
  }))
}

/**
 * Equivalent Character Class - /^[a-zA-Z0-9_]$/
 * 
 * @type {MatcherFn}
 */
const wordMatcher = (param) => /^\w+$/.test(param)

/**
 * 
 * @type {MatcherFn}
 */
const letterMatcher = (param) => /^[a-z]+$/i.test(param)

/**
 * 
 * @type {MatcherFn}
 */
const numberMatcher = (param) => /^\d+$/.test(param)

/**
 * 
 * @param {string} path 
 * @param {number} path_length 
 * @param {Node} node 
 * @param {number} start_index 
 * @returns {Route}
 */
const matchRoute = (path, path_length, node, start_index) => {
  const { segment } = node
  const segment_len = segment.length
  const segment_end_index = start_index + segment_len

  // Only check the segment if its length is > 1 since the parent has
  // already checked that the path matches the first character
  if (segment_len > 1) {
    if (segment_end_index > path_length)
      return null

    if (segment_len < 15) { // Using a loop is faster for short strings
      for (let i = 1, j = start_index + 1; i < segment_len; ++i, ++j) {
        if (segment[i] !== path[j]) {
          return null
        }
      }
    } else if (path.slice(start_index, segment_end_index) !== segment) {
      return null
    }
  }

  start_index = segment_end_index

  if (start_index === path_length) { // Reached the end of the URL
    if (node.store !== null) {
      return {
        store: node.store,
        params: {}
      }
    }

    if (node.wildcard_store !== null) {
      return {
        store: node.wildcard_store,
        params: {'*': ''}
      }
    }

    return null
  }

  if (node.static_children !== null) {
    const static_child = node.static_children.get(path.charCodeAt(start_index))

    if (static_child !== undefined) {
      const route = matchRoute(path, path_length, static_child, start_index)

      if (route !== null)
        return route
    }
  }

  if (node.parametric_children !== null) {
    const parametric_children = node.parametric_children
    const slash_index = path.indexOf('/', start_index)

    if (slash_index !== start_index) { // Params cannot be empty
      for (const parametric_node of parametric_children) {
        const [ _key, node ] = parametric_node

        if (node.matcher) {
          const type_match = node.matcher(path.slice(start_index))
          if (!type_match)
            continue
        }
        
        if (slash_index === -1 || slash_index >= path_length) {
          /* What does this mean? End of segment? */

          if (node.store !== null) {
            /** @type {Params} */
            const params = {} // This is much faster than using a computed property
            
            const param = path.slice(start_index, path_length)
            
            params[node.param_name] = param
            return {
              store: node.store,
              params
            }
          }
        } else if (node.static_child !== null) {
          const route = matchRoute(path, path_length, node.static_child, slash_index)

          if (route !== null) {
            route.params[node.param_name] = path.slice(start_index, slash_index)
            return route
          }
        }
      }
    }
  }

  if (node.wildcard_store !== null) {
    return {
      store: node.wildcard_store,
      params: {
        '*': path.slice(start_index, path_length)
      }
    }
  }

  return null
}

/**
 * A xin URL Router.
 * 
 * @type {Router}
 */
export class Router {
  /** @type {Node} */
  #root
  /** @type {StoreFactory} */
  #storeFactory
  /** @type {Map<string, Matcher>} */
  #matchers
  /** @type {Map<string, Matcher>} */
  #default_matchers

  /**
   * @param {Object} RouterArgs
   * @param {StoreFactory} [RouterArgs.storeFactory]
   */
  constructor({ storeFactory } = { storeFactory: defaultStoreFactory }) {
    if (typeof storeFactory !== 'function')
      throw new TypeError('`storeFactory` must be a function')

    const store = storeFactory()
    if (store === null) {
      throw new Error('Custom `storeFactory` must not return `null`.')
    }

    this.#root = createNode('/')
    this.#storeFactory = storeFactory
    this.#matchers = new Map()
    this.#default_matchers = new Map([
      ['word', wordMatcher],
      ['letter', letterMatcher],
      ['number', numberMatcher]
    ])
  }

  /**
   * Returns the root node, which represents the entire route tree.
   * 
   * @returns {Node}
   */
  getTree() {
    return this.#root
  }

  /**
   * Sets a matcher, to be used with matcher route types.
   * 
   * @param {string} type 
   * @param {Matcher} matcher
   */
  setMatcher(type, matcher) {
    this.#matchers.set(type, matcher)
  }

  /**
   * Returns a specific matcher function.
   * 
   * @param {string} type 
   * @returns {Matcher}
   */
  getMatcher(type) {
    const matcher = this.#matchers.get(type) ?? this.#default_matchers.get(type) ?? null

    return matcher
  }

  /**
   * 
   * @param {string} path 
   * @returns {Store}
   */
  register(path) {
    if (typeof path !== 'string') {
      throw new TypeError('Route path must be a string')
    }
    if (path === '' || path[0] !== '/') {
      throw new Error(`Invalid route: ${path}\nRoute path must begin with a "/"`)
    }

    const ends_with_wildcard = path.endsWith('*')

    if (ends_with_wildcard) {
      path = path.slice(0, -1) // Slice off trailing '*'
    }

    const static_segments = path.split(/:.+?(?=\/|$)/)
    const optional_segments = path.match(/:[\w.~-]+?\?(?=\/|$)/g) || []
    const matcher_regex = /:[\w.~-]+?=[a-zA-Z]+?(?=\/|$)/g
    const param_segments = path.match(/:[\w.~-]+?(?:=[a-zA-Z]+?)?(?=\/|$)/g) || []

    if (static_segments[static_segments.length - 1] === '')
      static_segments.pop()

    let node = this.#root
    let param_segments_index = 0

    for (let i = 0; i < static_segments.length; ++i) {
      /* There is at least one static segment. */
      let segment = static_segments[i]
      let is_matcher = false

      if (i > 0) { // Set parametric properties on the node
        const param = param_segments[param_segments_index]
        is_matcher = matcher_regex.test(param)

        let param_name = ''
        /** @type {Matcher} */
        let matcher = null
        /** @type {MatcherType} */
        let matcher_type = null

        if (is_matcher) {
          matcher_type = param.split('=')[1]
          /* Remove the leading : and anything after and including the = that defines the match type. */
          param_name = param_segments[param_segments_index++].slice(1, param.indexOf('='))
          matcher = this.getMatcher(matcher_type)
          if (!matcher)
            throw new Error(
              `Cannot create route "${path}" with matcher "${matcher_type}", because no definition exists in the params directory.`
            )
        } else {
          /* Is regular param, remove leading : */
          param_name = param_segments[param_segments_index++].slice(1)
        }

        if (node.parametric_children === null) {
          node.parametric_children = new Map()
          node.parametric_children.set(param_name, createParametricNode(param_name, matcher, matcher_type))
          // TODO sort parametric children so null matcher is last, for fallback
        } else {
          node.parametric_children.forEach((c) => {
            if (c.param_name !== param_name && c.matcher_type === matcher_type)
              throw new Error(
                `Cannot create route "${path}" with parameter "${param_name}"` + `${matcher_type ? 'and matcher type "' + matcher_type + '"' : ""}` +
                ` because a route already exists with parameter "${c.param_name}"` + `${c.matcher_type ? 'and matcher type "' + c.matcher_type + '"' : ""}` +
                ' at the same route path.'
              )
          })
        }

        if (!node.parametric_children.has(param_name)) {
          /* Causes future "current_parametric_child" to NOT be "undefined" */
          node.parametric_children.set(param_name, createParametricNode(param_name, matcher, matcher_type))

          /* Sort so that any non-matcher node is last in the map, therefore is checked last when matching. */
          node.parametric_children = sortMap(node.parametric_children)
        }
        
        const current_parametric_child = node.parametric_children.get(param_name)

        if (current_parametric_child?.static_child === null) {
          node = current_parametric_child.static_child = createNode(segment)
          continue
        }

        // TODO can this be an else for above?
        // @ts-ignore as this will not be "undefined". See ".set" above.
        node = current_parametric_child.static_child
      }

      for (let j = 0; ;) {
        if (j === segment.length) {
          /* Reached end of segment. */

          if (j < node.segment.length) { // Move the current node down
            const child_node = cloneNode(node, node.segment.slice(j))
            Object.assign(node, createNode(segment, [child_node]))
          }

          break
        }

        if (j === node.segment.length) { // Add static child
          const current_character = segment.charCodeAt(j)

          if (node.static_children !== null) {
            const maybe_child = node.static_children.get(current_character)

            if (maybe_child) {
              node = maybe_child
              segment = segment.slice(j)
              j = 0
              continue
            }
          } else {
            node.static_children = new Map()
          }

          // Create new node
          const child_node = createNode(segment.slice(j))
          node.static_children.set(current_character, child_node)
          node = child_node
          break
        }

        if (segment[j] !== node.segment[j]) { // Split the node
          const existing_child = cloneNode(node, node.segment.slice(j))
          const new_child = createNode(segment.slice(j))

          Object.assign(node, createNode(node.segment.slice(0, j), [existing_child, new_child]))
          node = new_child
          break
        }

        ++j
      }
    }

    if (param_segments_index < param_segments.length) { // The final part is a parameter
      let is_matcher = false
      let param_name = ''

      /** @type {Matcher} */
      let matcher = null

      const param = param_segments[param_segments_index]
      is_matcher = matcher_regex.test(param)

      /** @type {MatcherType} */
      let matcher_type = null

      if (is_matcher) {
        matcher_type = param.split('=')[1]

        /* Remove the leading : and anything after and including the = that defines the match type. */
        param_name = param.slice(1, param.indexOf('='))

        matcher = this.getMatcher(matcher_type)

        if (!matcher)
          throw new Error(
            `Cannot create route "${path}" with matcher "${matcher_type}", because no definition exists in the params directory.`
          )
      } else {
        /* Is regular param, remove leading : */
        param_name = param.slice(1)
      }

      if (node.parametric_children === null) {
        node.parametric_children = new Map()
        node.parametric_children.set(param_name, createParametricNode(param_name, matcher, matcher_type))
      } else {
        node.parametric_children.forEach((c) => {
          if (c.param_name !== param_name && c.matcher_type === matcher_type)
            throw new Error(
              `Cannot create route "${path}" with parameter "${param_name}"` + `${matcher_type ? 'and matcher type "' + matcher_type + '"' : ""}` +
              ` because a route already exists with parameter "${c.param_name}"` + `${c.matcher_type ? 'and matcher type "' + c.matcher_type + '"' : ""}` +
              ' at the same route path.'
            )
        })
      }

      if (!node.parametric_children.has(param_name)) {
        node.parametric_children.set(param_name, createParametricNode(param_name, matcher, matcher_type))

        /* Sort so that any non-matcher node is last in the map, therefore is checked last when matching. */
        node.parametric_children = sortMap(node.parametric_children)
      }
      
      /* We know that this will not be `undefined`, because of the `.set` above. */
      const current_parametric_child = node.parametric_children.get(param_name)
      if (current_parametric_child?.store === null)
        current_parametric_child.store = this.#storeFactory()

      // @ts-ignore we know this is defined at this point
      return current_parametric_child.store
    }

    if (ends_with_wildcard) { // The final part is a wildcard
      if (node.wildcard_store === null)
        node.wildcard_store = this.#storeFactory()

      return node.wildcard_store
    }

    // The final part is static
    if (node.store === null)
      node.store = this.#storeFactory()

    return node.store
  }

  /**
   * 
   * @param {string} path
   * @returns {Route}
   */
  find(path) {
    if (path === '' || path[0] !== '/')
      return null

    const query_index = path.indexOf('?')
    const path_length = query_index >= 0 ? query_index : path.length

    return matchRoute(path, path_length, this.#root, 0)
  }

  /**
   * Register a GET route.
   * 
   * @param {string} path
   * @param {Handler} handler
   */
  get(path, handler) {
    const store = this.register(path)
    store['GET'] = handler
  }

  /**
   * Register a POST route.
   * 
   * @param {string} path
   * @param {Handler} handler
   */
  post(path, handler) {
    const store = this.register(path)
    store['POST'] = handler
  }

  /**
   * Register a PUT route.
   * 
   * @param {string} path
   * @param {Handler} handler
   */
  put(path, handler) {
    const store = this.register(path)
    store['PUT'] = handler
  }

  /**
   * Register a PATCH route.
   * 
   * @param {string} path
   * @param {Handler} handler
   */
  patch(path, handler) {
    const store = this.register(path)
    store['PATCH'] = handler
  }

  /**
   * Register a DELETE route.
   * 
   * @param {string} path
   * @param {Handler} handler
   */
  delete(path, handler) {
    const store = this.register(path)
    store['DELETE'] = handler
  }

  /**
   * Register a HEAD route.
   * 
   * @param {string} path
   * @param {Handler} handler
   */
  head(path, handler) {
    const store = this.register(path)
    store['HEAD'] = handler
  }

  /**
   * Register an OPTIONS route.
   * 
   * @param {string} path
   * @param {Handler} handler
   */
  options(path, handler) {
    const store = this.register(path)
    store['OPTIONS'] = handler
  }

  /**
   * Register a fallback route, to match any methods not registered for a path.
   * 
   * @param {string} path
   * @param {Handler} handler
   */
  fallback(path, handler) {
    const store = this.register(path)
    store['fallback'] = handler
  }
}
