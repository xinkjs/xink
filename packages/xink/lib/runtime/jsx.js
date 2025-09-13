// Simple identifier for our VNode objects
const VNODE_TYPE = Symbol.for('xink.jsx.vnode')

/**
 * Represents a virtual node created by JSX.
 */
class JSXNode {
  type = VNODE_TYPE
  tag
  props
  key

  constructor(tag, props, key) {
    this.tag = tag
    this.props = props
    this.key = key
  }
}

// --- JSX Runtime Exports ---
export const Fragment = Symbol.for('xink.jsx.fragment')

/**
 * JSX transformer function (for single elements/components).
 * 
 * @param {string | symbol | function} tag HTML tag name or Fragment
 * @param {object} props Props object (children are under props.children)
 * @param {string | undefined} key Optional key
 * @returns {JSXNode}
 */
export function jsx(tag, props, key) {
  return new JSXNode(tag, props, key)
}

/**
 * JSX development transformer function.
 * In dev mode, Vite/compilers call this. It receives extra args for debugging.
 * For a minimal runtime, we can just call the regular jsx function.
 *
 * @param {string | symbol | function} tag
 * @param {object} props
 * @param {string | undefined} key
 * @param {boolean} isStaticChildren - Indicates if children are static (for jsxs optimization)
 * @param {object} sourceDebugInfo - { fileName, lineNumber, columnNumber }
 * @param {object} thisArg - The 'this' context
 * @returns {JSXNode}
 */
export function jsxDEV(tag, props, key, isStaticChildren, sourceDebugInfo, thisArg) {
  // Minimal implementation: Ignore dev-specific args and call the production jsx
  // You could add console.warn or checks using sourceDebugInfo here if desired
  return jsx(tag, props, key)
}

/**
 * JSX transformer function (optimized for multiple static children).
 * Same implementation as jsx for this minimal runtime.
 * 
 * @param {string | symbol | function} tag HTML tag name or Fragment
 * @param {object} props Props object (children are under props.children)
 * @param {string | undefined} key Optional key
 * @returns {JSXNode}
 */
export function jsxs(tag, props, key) {
    // In a more complex runtime, jsxs might optimize children array creation.
    // For basic rendering, it can be the same as jsx.
    return new JSXNode(tag, props, key)
}

/* Helper to check if something is one of our VNodes. */
export function isVNode(value) {
  return value instanceof JSXNode || (typeof value === 'object' && value !== null && value.type === VNODE_TYPE)
}

/* Basic HTML escaping. */
const escape_map = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
const escape_regex = /[&<>"']/g

function escapeHtml(str) {
  return String(str).replace(escape_regex, (char) => escape_map[char])
}

const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
])

/**
 * Renders a VNode or other value to an HTML string.
 * 
 * @param {any} node The node/value to render.
 * @returns {Promise<string>} The rendered HTML string.
 */
export const renderToString = async (node) => {
  if (node === null || node === undefined || typeof node === 'boolean')
    return ''

  if (typeof node === 'string' || typeof node === 'number')
    return escapeHtml(node)

  if (Array.isArray(node)) {
    // Render each item in the array recursively
    const rendered_children_promises = node.map(async (child) => await renderToString(child))

    // Await ALL the promises before joining
    const rendered_children = await Promise.all(rendered_children_promises)

    // Now join the array of resolved strings
    return rendered_children.join('')
  }

  // Check if it's our VNode structure
  if (isVNode(node)) {
    const { tag, props } = node

    // Handle Component
    if (typeof tag === 'function') {
      try {
        // Call the component function, passing props
        const component_result = await tag(props)
        // Recursively render the component's return value
        return await renderToString(component_result)
      } catch (error) {
        console.error('Error rendering component:', error)
        throw error // throw, so the developer can handle in handleError
      }
    }

    // Handle Fragment: just render children
    if (tag === Fragment)
      return await renderToString(props.children)

    // Handle HTML elements
    if (typeof tag === 'string') {
      let html = `<${tag}`
      let children_html = ''

      // Process props (attributes and children)
      for (const prop_name in props) {
        if (prop_name === 'children') {
          children_html = await renderToString(props.children)
          continue
        }

        // Skip event handlers (like onClick) on the server
        if (prop_name.startsWith('on') && typeof props[prop_name] === 'function')
          continue

        const value = props[prop_name]

        // Handle boolean attributes (e.g., disabled, checked)
        if (typeof value === 'boolean') {
          if (value) html += ` ${prop_name}` // Add attribute name if true
          // Skip attribute if false
        }
        // Handle other attributes
        else if (value !== null && value !== undefined) {
          // Basic handling for style objects (convert to string)
          if (prop_name === 'style' && typeof value === 'object') {
            const style_string = Object.entries(value)
              .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
              .join(';')
            html += ` ${prop_name}="${escapeHtml(style_string)}"`
          } else {
            html += ` ${prop_name}="${escapeHtml(String(value))}"`
          }
        }
      }

      // Check for void elements
      if (VOID_ELEMENTS.has(tag.toLowerCase())) {
        html += '/>' // Self-close void elements
        // Void elements cannot have children, ignore children_html
        return html
      } else {
        html += '>' // Close opening tag
        html += children_html // Add children
        html += `</${tag}>` // Add closing tag
        return html
      }
    }
  }

  // If we don't know how to render it, return empty string
  console.warn('Cannot render unknown node type:', node)
  return ''
}
