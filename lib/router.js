/** @import { Matcher, MatcherType, Node, Params, ParametricNode, Route, Store, StoreFactory } from './types/internal.js' */
/** @import { Handle } from '../types.js' */

/* ATTR: Largely based on Medley */

/**
 * 
 * @param {string} segment 
 * @param {Node[]} [static_children] 
 * @returns {Node}
 */
function createNode(segment, static_children) {
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
function cloneNode(node, new_segment) {
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
function createParametricNode(param_name, matcher = null, matcher_type = null) {
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
function defaultStoreFactory() {
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
    //console.log('Sorting', f, s)
    if (f === s) return 0
    if (f === null) return 1 /* a should come before b */
    if (s === null) return -1 /* b should come before a */
    return f < s ? 1 : -1 
  }))
}

/**
 * 
 * @param {string} param 
 * @returns {boolean}
 */
const stringMatcher = (param) => /^[a-zA-Z]+$/.test(param)

/**
 * 
 * @param {string} param 
 * @returns {boolean}
 */
const numberMatcher = (param) => /^[0-9]+$/.test(param)

/**
 * @class Router
 */
export class Router {
  /** @type {Node} */
  _root
  /** @type {StoreFactory} */
  _storeFactory
  /** @type {Map<string, Matcher>} */
  _matchers
  /** @type {Map<string, Matcher>} */
  _default_matchers
  /** @type {string | null} */
  _middleware = null

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

    this._root = createNode('/')
    this._storeFactory = storeFactory
    this._matchers = new Map()
    this._default_matchers = new Map([
      ['string', stringMatcher],
      ['number', numberMatcher]
    ])
  }

  getTree() {
    return this._root
  }

  /**
   * 
   * @param {string} type 
   * @param {Matcher} matcher
   */
  setMatcher(type, matcher) {
    //console.log('setting matcher for type', type)
    this._matchers.set(type, matcher)
    //console.log('set', this._matchers.get(type))
  }

  /**
   * 
   * @param {string} type 
   * @returns {Matcher} Matcher
   */
  getMatcher(type) {
    //console.log('trying to find matcher for', type)
    const matcher = this._matchers.get(type) ?? this._default_matchers.get(type) ?? null
    //console.log('find matcher?', matcher ? 'yes' : 'no')
    return matcher
  }

  /**
   * 
   * @param {Handle} handle 
   */
  setMiddleware(handle) {
    this._middleware = handle
  }

  /**
   * 
   * @returns {Handle | null}
   */
  getMiddleware() {
    return this._middleware
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
    console.log('Registering path', path)
    const ends_with_wildcard = path.endsWith('*')

    if (ends_with_wildcard) {
      console.log('Path ends with wildcard')
      path = path.slice(0, -1) // Slice off trailing '*'
    }

    const static_segments = path.split(/:.+?(?=\/|$)/)
    const optional_segments = path.match(/:[\w.~-]+?\?(?=\/|$)/g) || []
    //const param_segments = path.match(/:[\w.~-]+?(?=\/|$)/g) || []
    const matcher_regex = /:[\w.~-]+?=[a-zA-Z]+?(?=\/|$)/g
    const param_segments = path.match(/:[\w.~-]+?(?:=[a-zA-Z]+?)?(?=\/|$)/g) || []
    console.log('Static segments are', static_segments)
    console.log('Optional segments are', optional_segments)
    console.log('Param segments are', param_segments)

    if (static_segments[static_segments.length - 1] === '') {
      console.log('Popping last static segment, becuase it is an empty string')
      static_segments.pop()
    }

    let node = this._root
    let param_segments_index = 0

    for (let i = 0; i < static_segments.length; ++i) {
      /* At least one static segment. */
      console.log('i is ', i)
      let segment = static_segments[i]
      console.log('Processing path segment', segment)
      let is_matcher = false

      if (i > 0) { // Set parametric properties on the node
        const param = param_segments[param_segments_index]
        console.log('Pre-slice param segment top', param)
        is_matcher = matcher_regex.test(param)
        console.log(`param ${param} is matcher?`, is_matcher)
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
          console.log('Post-slice param segment top', param_name)
        }

        if (node.parametric_children === null) {
          console.log('Found no parametric child top, creating...')
          node.parametric_children = new Map()
          node.parametric_children.set(param_name, createParametricNode(param_name, matcher, matcher_type))
          console.log('Parametric child is', node.parametric_children.get(param_name))
          // TODO sort parametric children so null matcher is last, for fallback
        } else {
          node.parametric_children.forEach((c) => {
            if (c.param_name !== param_name && c.matcher_type === matcher_type)
              throw new Error(
                `Cannot create route "${path}" with parameter "${param_name}" and matcher type "${matcher_type}"` +
                'because a route already exists with a different parameter name and same matcher type ' +
                `("${c.param_name}") in the same location`
              )
          })
        }

        //const { parametric_children } = node
        console.log('parametric_children from node', node.parametric_children)
        if (!node.parametric_children.has(param_name)) {
          console.log('setting parametric child for param', param_name)
          // Causes future "current_parametric_child" to NOT be "undefined"
          node.parametric_children.set(param_name, createParametricNode(param_name, matcher, matcher_type))

          /* Sort so that any non-matcher node is last in the map, therefore is checked last when matching. */
          node.parametric_children = sortMap(node.parametric_children)
          console.log('parametric children now', node.parametric_children)
        }
        
        const current_parametric_child = node.parametric_children.get(param_name)

        if (current_parametric_child?.static_child === null) {
          console.log('Parametric child has no static child; creating...')
          node = current_parametric_child.static_child = createNode(segment)
          console.log('Parametric childs static child is now', node)
          continue
        }

        // TODO can this be an else for above?
        // @ts-ignore as this will not be "undefined". See ".set" above.
        node = current_parametric_child.static_child
        console.log('Parametric childs static child is', node)
      }

      for (let j = 0; ;) {
        console.log('j is', j, 'segment length is', segment.length)
        if (j === segment.length) {
          /* Reached end of segment. */
          console.log('Reached end of segment.')
          console.log('j === segment.length', j, segment.length)
          if (j < node.segment.length) { // Move the current node down
            console.log('j is less than nodes segment length; clone.', j, node.segment.length)
            console.log('cloning node', node, 'for', node.segment.slice(j))
            const child_node = cloneNode(node, node.segment.slice(j))
            console.log('child_node is', child_node, '; moving down.')
            Object.assign(node, createNode(segment, [child_node]))
            console.log('Post move, node is', node)
          }
          console.log('breaking out of j === segment.length if')
          break
        }

        if (j === node.segment.length) { // Add static child
          console.log('j === node.segment.length', j, node.segment.length, node.segment)
          const current_character = segment.charCodeAt(j)
          console.log('current_character is', segment[j], current_character)

          if (node.static_children !== null) {
            console.log('nodes static_children is not null; has current_character?', node.static_children)
            const maybe_child = node.static_children.get(current_character)
            console.log('node.static_children has current character?', !!maybe_child)
            if (maybe_child) {
              console.log('yep, node static children has current character')
              node = maybe_child
              console.log('node is now that child', node)
              segment = segment.slice(j)
              console.log(`sliced segment at value of ${j}, now`, segment, 'setting j to 0 and continuing')
              j = 0
              continue
            }
          } else {
            console.log('node.static_children is null; assign new Map')
            node.static_children = new Map()
          }

          // Create new node
          const child_node = createNode(segment.slice(j))
          console.log('created child node from segment slice', j, child_node)
          console.log('setting node.static_children to node above, with character', current_character, 'as key')
          node.static_children.set(current_character, child_node)
          console.log('setting node to child_node and breaking')
          node = child_node

          break
        }

        if (segment[j] !== node.segment[j]) { // Split the node
          console.log('segment', segment[j], 'does not equal node.segment', node.segment[j], '; split node')
          const existing_child = cloneNode(node, node.segment.slice(j))
          console.log('existing_child', existing_child, 'is now clone of', node, 'and node.segment.slice(j)', node.segment.slice(j))
          const new_child = createNode(segment.slice(j))
          console.log('new_child is', new_child, 'by creating node from', segment.slice(j))

          Object.assign(node, createNode(node.segment.slice(0, j), [existing_child, new_child]))
          console.log('Assigning new node from', node.segment.slice(0, j), 'and children', [existing_child, new_child], 'to', node)

          node = new_child
          console.log('node is now new_child', new_child, 'and breaking')

          break
        }

        ++j
        console.log('add 1 to j. j now', j)
      }
    }

    if (param_segments_index < param_segments.length) { // The final part is a parameter
      console.log('final segment is a param', param_segments_index, 'is less than', param_segments.length)
      let is_matcher = false
      let param_name = ''

      /** @type {Matcher} */
      let matcher = null

      const param = param_segments[param_segments_index]
      console.log('param is bottom', param)
      is_matcher = matcher_regex.test(param)

      /** @type {MatcherType} */
      let matcher_type = null

      if (is_matcher) {
        console.log('is matcher')
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
        console.log('sliced 1 from param, to get param_name bottom', param_name)
      }

      if (node.parametric_children === null) {
        console.log('Found no parametric child bottom, creating...')
        node.parametric_children = new Map()
        node.parametric_children.set(param_name, createParametricNode(param_name, matcher, matcher_type))
        console.log('Parametric child is', node.parametric_children.get(param_name))
      } else {
        console.log('Found parametric children', node.parametric_children)
        node.parametric_children.forEach((c) => {
          if (c.param_name !== param_name && c.matcher_type === matcher_type)
            throw new Error(
              `Cannot create route "${path}" with parameter "${param_name}" and matcher type "${matcher_type}"` +
              'because a route already exists with a different parameter name and same matcher type ' +
              `("${c.param_name}") in the same location`
            )
        })
      }

      if (!node.parametric_children.has(param_name)) {
        console.log('setting parametric child for param', param_name)
        node.parametric_children.set(param_name, createParametricNode(param_name, matcher, matcher_type))

        /* Sort so that any non-matcher node is last in the map, therefore is checked last when matching. */
        node.parametric_children = sortMap(node.parametric_children)
        console.log('parametric children now', node.parametric_children)
      }
      
      /* We know that this will not be `undefined`, because of the `.set` above. */
      const current_parametric_child = node.parametric_children.get(param_name)
      if (current_parametric_child?.store === null) {
        console.log('current_parametric_child.store is null; create store')
        current_parametric_child.store = this._storeFactory()
        console.log('created store for parametric', current_parametric_child.store)
      }
      console.log('returning newly created store.', current_parametric_child.store)
      // @ts-ignore
      return current_parametric_child.store
    }

    if (ends_with_wildcard) { // The final part is a wildcard
      //console.log('final part is a wildcard')
      if (node.wildcard_store === null) {
        //console.log('final part does not have a wildcard store; create store')
        node.wildcard_store = this._storeFactory()
        //console.log('created store for wildcard', node.wildcard_store, 'for final wildcard part')
      }
      //console.log('returning wildcard store', node.wildcard_store)
      return node.wildcard_store
    }

    // The final part is static
    if (node.store === null) {
      console.log('final part is static because node', node, 'does not have a store; create store')
      node.store = this._storeFactory()
      console.log('created store for static', node.store)
    }
    console.log('returning static store', node.store)
    return node.store
  }

  /**
   * 
   * @param {string} path
   * @returns {Route}
   */
  find(path) {
    if (path === '' || path[0] !== '/') {
      return null
    }

    const query_index = path.indexOf('?')
    console.log('query index', query_index)
    const path_length = query_index >= 0 ? query_index : path.length
    console.log('path length', path_length)
    return matchRoute(path, path_length, this._root, 0)
  }
}

/**
 * 
 * @param {string} path 
 * @param {number} path_length 
 * @param {Node} node 
 * @param {number} start_index 
 * @returns {Route}
 */
function matchRoute(path, path_length, node, start_index) {
  const { segment } = node
  console.log('segment', segment)
  const segment_len = segment.length
  console.log('segment length', segment_len)
  const segment_end_index = start_index + segment_len
  console.log('segment end index', segment_end_index)

  // Only check the segment if its length is > 1 since the parent has
  // already checked that the path matches the first character
  if (segment_len > 1) {
    console.log('segment length > 1')
    if (segment_end_index > path_length) {
      console.log('segment is longer than path. no match. return')
      return null
    }

    if (segment_len < 15) { // Using a loop is faster for short strings
      console.log('segment length < 15, looping to attempt match')
      for (let i = 1, j = start_index + 1; i < segment_len; ++i, ++j) {
        console.log('comparing', segment[i], path[j])
        if (segment[i] !== path[j]) {
          console.log('no short match. return')
          return null
        }
      }
    } else if (path.slice(start_index, segment_end_index) !== segment) {
      console.log('no long match. return')
      return null
    }
  }

  start_index = segment_end_index
  console.log('start index is now', start_index)

  if (start_index === path_length) { // Reached the end of the URL
    console.log('reached end of path')
    if (node.store !== null) {
      console.log('node has a store. returning', node.store)
      return {
        store: node.store,
        params: {}
      }
    }

    if (node.wildcard_store !== null) {
      console.log('found wildcard, returning', node.wildcard_store)
      return {
        store: node.wildcard_store,
        params: {'*': ''}
      }
    }

    return null
  }

  if (node.static_children !== null) {
    console.log(`node ${node.segment} has static children:`, node.static_children)
    console.log('looking for character', path.charCodeAt(start_index))
    const static_child = node.static_children.get(path.charCodeAt(start_index))
    console.log('got static child', static_child)
    if (static_child !== undefined) {
      console.log('child matched, process child', static_child)
      const route = matchRoute(path, path_length, static_child, start_index)

      if (route !== null) {
        console.log('match found', route)
        return route
      }
    }
  }

  if (node.parametric_children !== null) {
    const parametric_children = node.parametric_children
    console.log('node has parametric children', parametric_children)
    const slash_index = path.indexOf('/', start_index)
    console.log('slash index is', slash_index)

    if (slash_index !== start_index) { // Params cannot be empty
      console.log('slash index', slash_index, 'and start index', start_index, 'do not match')

      for (const parametric_node of parametric_children) {
        const [ key, node ] = parametric_node
        console.log('processing param key', key, node)
        if (node.matcher) {
          console.log('found matcher', node.matcher)
          const type_match = node.matcher(path.slice(start_index))
          if (!type_match) {
            console.log('parametric node has matcher but does not match param type')
            continue
          }
        }
        if (slash_index === -1 || slash_index >= path_length) {
          /* What does this mean? End of segment? */

          if (node.store !== null) {
            console.log('found parametric node store. return', node.store)
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
          console.log('parametric node has static child', node.static_child, 'process child')
          const route = matchRoute(path, path_length, node.static_child, slash_index)

          if (route !== null) {
            console.log('set params and return route', route)
            route.params[node.param_name] = path.slice(start_index, slash_index)
            return route
          }
        }
      }
    }
  }

  if (node.wildcard_store !== null) {
    console.log('node has wildcard store. return', node.wildcard_store)
    return {
      store: node.wildcard_store,
      params: {
        '*': url.slice(start_index, url_length)
      }
    }
  }

  return null
}
