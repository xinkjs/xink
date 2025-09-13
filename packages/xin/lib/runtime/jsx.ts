import type * as CSS from "csstype"

// Simple identifier for our VNode objects
const VNODE_TYPE = Symbol.for('xin.jsx.vnode')

// Define the type for props, including children
export interface JsxProps extends Record<string, any>{
  children?: XinRenderableChild | XinRenderableChild[];
  key?: string | number | undefined;
}

/**
 * Represents a virtual node created by JSX.
 */
export class JSXNode {
  type = VNODE_TYPE
  tag
  props
  key

  constructor(tag: string | symbol | Function, props: JsxProps, key?: string) {
    this.tag = tag
    this.props = props
    this.key = key
  }
}

// --- JSX Runtime Exports ---
export const Fragment = Symbol.for('xin.jsx.fragment')

/**
 * JSX transformer function (for single elements/components).
 */
export function jsx(tag: string | symbol | Function, props: JsxProps, key: string | undefined): JSXNode {
  return new JSXNode(tag, props, key)
}

/**
 * JSX development transformer function.
 * In dev mode, Vite/compilers call this. It receives extra args for debugging.
 * For a minimal runtime, we can just call the regular jsx function.
 *
 */
export function jsxDEV(tag: string | symbol | Function, props: JsxProps, key: string | undefined, isStaticChildren: boolean, sourceDebugInfo: object, thisArg: object): JSXNode {
  // Minimal implementation: Ignore dev-specific args and call the production jsx
  // You could add console.warn or checks using sourceDebugInfo here if desired
  return jsx(tag, props, key)
}

/**
 * JSX transformer function (optimized for multiple static children).
 * Same implementation as jsx for this minimal runtime.
 */
export function jsxs(tag: string | symbol | Function, props: JsxProps, key: string | undefined): JSXNode {
    // In a more complex runtime, jsxs might optimize children array creation.
    // For basic rendering, it can be the same as jsx.
    return new JSXNode(tag, props, key)
}

/* Helper to check if something is one of our VNodes. */
export function isVNode(value: JSXNode | Record<string, any>) {
  return value instanceof JSXNode || (typeof value === 'object' && value !== null && value.type === VNODE_TYPE)
}

/* Basic HTML escaping. */
const escape_map = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
} as const
const escape_regex = /[&<>"']/g

type EscapeMapKeys = keyof typeof escape_map

function escapeHtml(str: string | number): string {
  return String(str).replace(escape_regex, (char: string) => escape_map[char as EscapeMapKeys])
}

const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
])

/**
 * Renders a VNode or other value to an HTML string.
 */
export const renderToString = async (node: any): Promise<string> => {
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

// Define recursive renderable type here or import it
type XinRenderableChild =
  JSX.Element |
  string |
  number |
  boolean |
  null |
  undefined |
  Array<XinRenderableChild>;

interface XinDefaultAttributes {
  children?: XinRenderableChild | XinRenderableChild[];
  key?: string | number | undefined;
}

/**
 * Fuction Component
 */
type FC<Props = {}> = (props: Props & XinDefaultAttributes) => (
  JSX.Element | 
  Promise<JSX.Element | string | Array<JSX.Element | string | number | null | undefined> | null | undefined> | 
  string | 
  Array<JSX.Element | string | number | null | undefined> | 
  null | 
  undefined);

// Make the JSX namespace available globally for TSX files
declare global {
  namespace JSX {
    /**
     * Represents a JSX element structure.
     * Corresponds to the return type of the jsx/jsxs functions.
     */
    type Element = JSXNode;

    // TODO: change any to unknown when moving to TS v3
    interface BaseSyntheticEvent<E = object, C = any, T = any> {
      nativeEvent: E;
      currentTarget: C;
      target: T;
      bubbles: boolean;
      cancelable: boolean;
      defaultPrevented: boolean;
      eventPhase: number;
      isTrusted: boolean;
      preventDefault(): void;
      isDefaultPrevented(): boolean;
      stopPropagation(): void;
      isPropagationStopped(): boolean;
      persist(): void;
      timeStamp: number;
      type: string;
    }

    interface SyntheticEvent {
      nativeEvent: Event;
      currentTarget: EventTarget;
      target: EventTarget;
      type: string;
      timeStamp: number;
      bubbles: boolean;
      cancelable: boolean;
      defaultPrevented: boolean;
      isTrusted: boolean;
      preventDefault(): void;
      stopPropagation(): void;
    }

    type EventHandler = (event: Event) => void;
    type ChangeEventHandler = (event: Event) => void;

    type Booleanish = boolean | "true" | "false";

    /**
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin MDN}
     */
    type CrossOrigin = "anonymous" | "use-credentials" | "" | undefined;

    type HTMLInputAutoCompleteAttribute = AutoFill | (string & {});

    interface CSSProperties extends CSS.Properties<string | number> {
      /**
       * The index signature was removed to enable closed typing for style
       * using CSSType. You're able to use type assertion or module augmentation
       * to add properties or an index signature of your own.
       *
       * For examples and more information, visit:
       * https://github.com/frenic/csstype#what-should-i-do-when-i-get-type-errors
       */
    }

    // All the WAI-ARIA 1.1 role attribute values from https://www.w3.org/TR/wai-aria-1.1/#role_definitions
    type AriaRole =
      | "alert"
      | "alertdialog"
      | "application"
      | "article"
      | "banner"
      | "button"
      | "cell"
      | "checkbox"
      | "columnheader"
      | "combobox"
      | "complementary"
      | "contentinfo"
      | "definition"
      | "dialog"
      | "directory"
      | "document"
      | "feed"
      | "figure"
      | "form"
      | "grid"
      | "gridcell"
      | "group"
      | "heading"
      | "img"
      | "link"
      | "list"
      | "listbox"
      | "listitem"
      | "log"
      | "main"
      | "marquee"
      | "math"
      | "menu"
      | "menubar"
      | "menuitem"
      | "menuitemcheckbox"
      | "menuitemradio"
      | "navigation"
      | "none"
      | "note"
      | "option"
      | "presentation"
      | "progressbar"
      | "radio"
      | "radiogroup"
      | "region"
      | "row"
      | "rowgroup"
      | "rowheader"
      | "scrollbar"
      | "search"
      | "searchbox"
      | "separator"
      | "slider"
      | "spinbutton"
      | "status"
      | "switch"
      | "tab"
      | "table"
      | "tablist"
      | "tabpanel"
      | "term"
      | "textbox"
      | "timer"
      | "toolbar"
      | "tooltip"
      | "tree"
      | "treegrid"
      | "treeitem"
      | (string & {});

    type HTMLAttributeReferrerPolicy =
      | ""
      | "no-referrer"
      | "no-referrer-when-downgrade"
      | "origin"
      | "origin-when-cross-origin"
      | "same-origin"
      | "strict-origin"
      | "strict-origin-when-cross-origin"
      | "unsafe-url";

    type HTMLAttributeAnchorTarget =
      | "_self"
      | "_blank"
      | "_parent"
      | "_top"
      | (string & {});

    // All the WAI-ARIA 1.1 attributes from https://www.w3.org/TR/wai-aria-1.1/
    interface AriaAttributes {
      /** Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. */
      "aria-activedescendant"?: string | undefined;
      /** Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. */
      "aria-atomic"?: Booleanish | undefined;
      /**
       * Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be
       * presented if they are made.
       */
      "aria-autocomplete"?: "none" | "inline" | "list" | "both" | undefined;
      /** Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user. */
      /**
       * Defines a string value that labels the current element, which is intended to be converted into Braille.
       * @see aria-label.
       */
      "aria-braillelabel"?: string | undefined;
      /**
       * Defines a human-readable, author-localized abbreviated description for the role of an element, which is intended to be converted into Braille.
       * @see aria-roledescription.
       */
      "aria-brailleroledescription"?: string | undefined;
      "aria-busy"?: Booleanish | undefined;
      /**
       * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
       * @see aria-pressed @see aria-selected.
       */
      "aria-checked"?: boolean | "false" | "mixed" | "true" | undefined;
      /**
       * Defines the total number of columns in a table, grid, or treegrid.
       * @see aria-colindex.
       */
      "aria-colcount"?: number | undefined;
      /**
       * Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.
       * @see aria-colcount @see aria-colspan.
       */
      "aria-colindex"?: number | undefined;
      /**
       * Defines a human readable text alternative of aria-colindex.
       * @see aria-rowindextext.
       */
      "aria-colindextext"?: string | undefined;
      /**
       * Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
       * @see aria-colindex @see aria-rowspan.
       */
      "aria-colspan"?: number | undefined;
      /**
       * Identifies the element (or elements) whose contents or presence are controlled by the current element.
       * @see aria-owns.
       */
      "aria-controls"?: string | undefined;
      /** Indicates the element that represents the current item within a container or set of related elements. */
      "aria-current"?: boolean | "false" | "true" | "page" | "step" | "location" | "date" | "time" | undefined;
      /**
       * Identifies the element (or elements) that describes the object.
       * @see aria-labelledby
       */
      "aria-describedby"?: string | undefined;
      /**
       * Defines a string value that describes or annotates the current element.
       * @see related aria-describedby.
       */
      "aria-description"?: string | undefined;
      /**
       * Identifies the element that provides a detailed, extended description for the object.
       * @see aria-describedby.
       */
      "aria-details"?: string | undefined;
      /**
       * Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
       * @see aria-hidden @see aria-readonly.
       */
      "aria-disabled"?: Booleanish | undefined;
      /**
       * Indicates what functions can be performed when a dragged object is released on the drop target.
       * @deprecated in ARIA 1.1
       */
      "aria-dropeffect"?: "none" | "copy" | "execute" | "link" | "move" | "popup" | undefined;
      /**
       * Identifies the element that provides an error message for the object.
       * @see aria-invalid @see aria-describedby.
       */
      "aria-errormessage"?: string | undefined;
      /** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
      "aria-expanded"?: Booleanish | undefined;
      /**
       * Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
       * allows assistive technology to override the general default of reading in document source order.
       */
      "aria-flowto"?: string | undefined;
      /**
       * Indicates an element's "grabbed" state in a drag-and-drop operation.
       * @deprecated in ARIA 1.1
       */
      "aria-grabbed"?: Booleanish | undefined;
      /** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
      "aria-haspopup"?: boolean | "false" | "true" | "menu" | "listbox" | "tree" | "grid" | "dialog" | undefined;
      /**
       * Indicates whether the element is exposed to an accessibility API.
       * @see aria-disabled.
       */
      "aria-hidden"?: Booleanish | undefined;
      /**
       * Indicates the entered value does not conform to the format expected by the application.
       * @see aria-errormessage.
       */
      "aria-invalid"?: boolean | "false" | "true" | "grammar" | "spelling" | undefined;
      /** Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. */
      "aria-keyshortcuts"?: string | undefined;
      /**
       * Defines a string value that labels the current element.
       * @see aria-labelledby.
       */
      "aria-label"?: string | undefined;
      /**
       * Identifies the element (or elements) that labels the current element.
       * @see aria-describedby.
       */
      "aria-labelledby"?: string | undefined;
      /** Defines the hierarchical level of an element within a structure. */
      "aria-level"?: number | undefined;
      /** Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. */
      "aria-live"?: "off" | "assertive" | "polite" | undefined;
      /** Indicates whether an element is modal when displayed. */
      "aria-modal"?: Booleanish | undefined;
      /** Indicates whether a text box accepts multiple lines of input or only a single line. */
      "aria-multiline"?: Booleanish | undefined;
      /** Indicates that the user may select more than one item from the current selectable descendants. */
      "aria-multiselectable"?: Booleanish | undefined;
      /** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
      "aria-orientation"?: "horizontal" | "vertical" | undefined;
      /**
       * Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
       * between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
       * @see aria-controls.
       */
      "aria-owns"?: string | undefined;
      /**
       * Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.
       * A hint could be a sample value or a brief description of the expected format.
       */
      "aria-placeholder"?: string | undefined;
      /**
       * Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
       * @see aria-setsize.
       */
      "aria-posinset"?: number | undefined;
      /**
       * Indicates the current "pressed" state of toggle buttons.
       * @see aria-checked @see aria-selected.
       */
      "aria-pressed"?: boolean | "false" | "mixed" | "true" | undefined;
      /**
       * Indicates that the element is not editable, but is otherwise operable.
       * @see aria-disabled.
       */
      "aria-readonly"?: Booleanish | undefined;
      /**
       * Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
       * @see aria-atomic.
       */
      "aria-relevant"?:
        | "additions"
        | "additions removals"
        | "additions text"
        | "all"
        | "removals"
        | "removals additions"
        | "removals text"
        | "text"
        | "text additions"
        | "text removals"
        | undefined;
      /** Indicates that user input is required on the element before a form may be submitted. */
      "aria-required"?: Booleanish | undefined;
      /** Defines a human-readable, author-localized description for the role of an element. */
      "aria-roledescription"?: string | undefined;
      /**
       * Defines the total number of rows in a table, grid, or treegrid.
       * @see aria-rowindex.
       */
      "aria-rowcount"?: number | undefined;
      /**
       * Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
       * @see aria-rowcount @see aria-rowspan.
       */
      "aria-rowindex"?: number | undefined;
      /**
       * Defines a human readable text alternative of aria-rowindex.
       * @see aria-colindextext.
       */
      "aria-rowindextext"?: string | undefined;
      /**
       * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
       * @see aria-rowindex @see aria-colspan.
       */
      "aria-rowspan"?: number | undefined;
      /**
       * Indicates the current "selected" state of various widgets.
       * @see aria-checked @see aria-pressed.
       */
      "aria-selected"?: Booleanish | undefined;
      /**
       * Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
       * @see aria-posinset.
       */
      "aria-setsize"?: number | undefined;
      /** Indicates if items in a table or grid are sorted in ascending or descending order. */
      "aria-sort"?: "none" | "ascending" | "descending" | "other" | undefined;
      /** Defines the maximum allowed value for a range widget. */
      "aria-valuemax"?: number | undefined;
      /** Defines the minimum allowed value for a range widget. */
      "aria-valuemin"?: number | undefined;
      /**
       * Defines the current value for a range widget.
       * @see aria-valuetext.
       */
      "aria-valuenow"?: number | undefined;
      /** Defines the human readable text alternative of aria-valuenow for a range widget. */
      "aria-valuetext"?: string | undefined;
    }

    interface JSXAttributes {
      dangerouslySetInnerHTML?: {
        // Should be InnerHTML['innerHTML'].
        // But unfortunately we're mixing renderer-specific type declarations.
        __html: string;
      };
    }

    type Event = globalThis.Event
    type MouseEvent = globalThis.MouseEvent
    type KeyboardEvent = globalThis.KeyboardEvent
    type FocusEvent = globalThis.FocusEvent
    type ClipboardEvent = globalThis.ClipboardEvent
    type InputEvent = globalThis.InputEvent
    type PointerEvent = globalThis.PointerEvent
    type TouchEvent = globalThis.TouchEvent
    type WheelEvent = globalThis.WheelEvent
    type AnimationEvent = globalThis.AnimationEvent
    type TransitionEvent = globalThis.TransitionEvent
    type DragEvent = globalThis.DragEvent

    interface EventAttributes {
      onScroll?: (event: Event) => void
      onScrollCapture?: (event: Event) => void
      onScrollEnd?: (event: Event) => void
      onScrollEndCapture?: (event: Event) => void
      onWheel?: (event: WheelEvent) => void
      onWheelCapture?: (event: WheelEvent) => void
      onAnimationCancel?: (event: AnimationEvent) => void
      onAnimationCancelCapture?: (event: AnimationEvent) => void
      onAnimationEnd?: (event: AnimationEvent) => void
      onAnimationEndCapture?: (event: AnimationEvent) => void
      onAnimationIteration?: (event: AnimationEvent) => void
      onAnimationIterationCapture?: (event: AnimationEvent) => void
      onAnimationStart?: (event: AnimationEvent) => void
      onAnimationStartCapture?: (event: AnimationEvent) => void
      onCopy?: (event: ClipboardEvent) => void
      onCopyCapture?: (event: ClipboardEvent) => void
      onCut?: (event: ClipboardEvent) => void
      onCutCapture?: (event: ClipboardEvent) => void
      onPaste?: (event: ClipboardEvent) => void
      onPasteCapture?: (event: ClipboardEvent) => void
      onCompositionEnd?: (event: CompositionEvent) => void
      onCompositionEndCapture?: (event: CompositionEvent) => void
      onCompositionStart?: (event: CompositionEvent) => void
      onCompositionStartCapture?: (event: CompositionEvent) => void
      onCompositionUpdate?: (event: CompositionEvent) => void
      onCompositionUpdateCapture?: (event: CompositionEvent) => void
      onBlur?: (event: FocusEvent) => void
      onBlurCapture?: (event: FocusEvent) => void
      onFocus?: (event: FocusEvent) => void
      onFocusCapture?: (event: FocusEvent) => void
      onFocusIn?: (event: FocusEvent) => void
      onFocusInCapture?: (event: FocusEvent) => void
      onFocusOut?: (event: FocusEvent) => void
      onFocusOutCapture?: (event: FocusEvent) => void
      onFullscreenChange?: (event: Event) => void
      onFullscreenChangeCapture?: (event: Event) => void
      onFullscreenError?: (event: Event) => void
      onFullscreenErrorCapture?: (event: Event) => void
      onKeyDown?: (event: KeyboardEvent) => void
      onKeyDownCapture?: (event: KeyboardEvent) => void
      onKeyPress?: (event: KeyboardEvent) => void
      onKeyPressCapture?: (event: KeyboardEvent) => void
      onKeyUp?: (event: KeyboardEvent) => void
      onKeyUpCapture?: (event: KeyboardEvent) => void
      onAuxClick?: (event: MouseEvent) => void
      onAuxClickCapture?: (event: MouseEvent) => void
      onClick?: (event: MouseEvent) => void
      onClickCapture?: (event: MouseEvent) => void
      onContextMenu?: (event: MouseEvent) => void
      onContextMenuCapture?: (event: MouseEvent) => void
      onDoubleClick?: (event: MouseEvent) => void
      onDoubleClickCapture?: (event: MouseEvent) => void
      onMouseDown?: (event: MouseEvent) => void
      onMouseDownCapture?: (event: MouseEvent) => void
      onMouseEnter?: (event: MouseEvent) => void
      onMouseEnterCapture?: (event: MouseEvent) => void
      onMouseLeave?: (event: MouseEvent) => void
      onMouseLeaveCapture?: (event: MouseEvent) => void
      onMouseMove?: (event: MouseEvent) => void
      onMouseMoveCapture?: (event: MouseEvent) => void
      onMouseOut?: (event: MouseEvent) => void
      onMouseOutCapture?: (event: MouseEvent) => void
      onMouseOver?: (event: MouseEvent) => void
      onMouseOverCapture?: (event: MouseEvent) => void
      onMouseUp?: (event: MouseEvent) => void
      onMouseUpCapture?: (event: MouseEvent) => void
      onMouseWheel?: (event: WheelEvent) => void
      onMouseWheelCapture?: (event: WheelEvent) => void
      onGotPointerCapture?: (event: PointerEvent) => void
      onGotPointerCaptureCapture?: (event: PointerEvent) => void
      onLostPointerCapture?: (event: PointerEvent) => void
      onLostPointerCaptureCapture?: (event: PointerEvent) => void
      onPointerCancel?: (event: PointerEvent) => void
      onPointerCancelCapture?: (event: PointerEvent) => void
      onPointerDown?: (event: PointerEvent) => void
      onPointerDownCapture?: (event: PointerEvent) => void
      onPointerEnter?: (event: PointerEvent) => void
      onPointerEnterCapture?: (event: PointerEvent) => void
      onPointerLeave?: (event: PointerEvent) => void
      onPointerLeaveCapture?: (event: PointerEvent) => void
      onPointerMove?: (event: PointerEvent) => void
      onPointerMoveCapture?: (event: PointerEvent) => void
      onPointerOut?: (event: PointerEvent) => void
      onPointerOutCapture?: (event: PointerEvent) => void
      onPointerOver?: (event: PointerEvent) => void
      onPointerOverCapture?: (event: PointerEvent) => void
      onPointerUp?: (event: PointerEvent) => void
      onPointerUpCapture?: (event: PointerEvent) => void
      onTouchCancel?: (event: TouchEvent) => void
      onTouchCancelCapture?: (event: TouchEvent) => void
      onTouchEnd?: (event: TouchEvent) => void
      onTouchEndCapture?: (event: TouchEvent) => void
      onTouchMove?: (event: TouchEvent) => void
      onTouchMoveCapture?: (event: TouchEvent) => void
      onTouchStart?: (event: TouchEvent) => void
      onTouchStartCapture?: (event: TouchEvent) => void
      onTransitionCancel?: (event: TransitionEvent) => void
      onTransitionCancelCapture?: (event: TransitionEvent) => void
      onTransitionEnd?: (event: TransitionEvent) => void
      onTransitionEndCapture?: (event: TransitionEvent) => void
      onTransitionRun?: (event: TransitionEvent) => void
      onTransitionRunCapture?: (event: TransitionEvent) => void
      onTransitionStart?: (event: TransitionEvent) => void
      onTransitionStartCapture?: (event: TransitionEvent) => void
      onFormData?: (event: FormDataEvent) => void
      onFormDataCapture?: (event: FormDataEvent) => void
      onReset?: (event: Event) => void
      onResetCapture?: (event: Event) => void
      onSubmit?: (event: Event) => void
      onSubmitCapture?: (event: Event) => void
      onInvalid?: (event: Event) => void
      onInvalidCapture?: (event: Event) => void
      onSelect?: (event: Event) => void
      onSelectCapture?: (event: Event) => void
      onSelectChange?: (event: Event) => void
      onSelectChangeCapture?: (event: Event) => void
      onInput?: (event: InputEvent) => void
      onInputCapture?: (event: InputEvent) => void
      onBeforeInput?: (event: InputEvent) => void
      onBeforeInputCapture?: (event: InputEvent) => void
      onChange?: (event: Event) => void
      onChangeCapture?: (event: Event) => void
    }

    interface HTMLAttributes extends XinDefaultAttributes, AriaAttributes, JSXAttributes, EventAttributes {
      // Standard HTML Attributes
      accessKey?: string | undefined;
      autoCapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters" | undefined | (string & {});
      autoFocus?: boolean | undefined;
      className?: string | undefined;
      contentEditable?: Booleanish | "inherit" | "plaintext-only" | undefined;
      contextMenu?: string | undefined;
      dir?: string | undefined;
      draggable?: Booleanish | undefined;
      enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send" | undefined;
      hidden?: boolean | undefined;
      id?: string | undefined;
      lang?: string | undefined;
      nonce?: string | undefined;
      slot?: string | undefined;
      spellCheck?: Booleanish | undefined;
      style?: CSSProperties | undefined;
      tabIndex?: number | undefined;
      title?: string | undefined;
      translate?: "yes" | "no" | undefined;

      // Unknown
      radioGroup?: string | undefined; // <command>, <menuitem>

      // WAI-ARIA
      role?: AriaRole | undefined;

      // RDFa Attributes
      about?: string | undefined;
      content?: string | undefined;
      datatype?: string | undefined;
      inlist?: any;
      prefix?: string | undefined;
      property?: string | undefined;
      rel?: string | undefined;
      resource?: string | undefined;
      rev?: string | undefined;
      typeof?: string | undefined;
      vocab?: string | undefined;

      // Non-standard Attributes
      autoCorrect?: string | undefined;
      autoSave?: string | undefined;
      color?: string | undefined;
      itemProp?: string | undefined;
      itemScope?: boolean | undefined;
      itemType?: string | undefined;
      itemID?: string | undefined;
      itemRef?: string | undefined;
      results?: number | undefined;
      security?: string | undefined;
      unselectable?: "on" | "off" | undefined;

      // Popover API
      popover?: "" | "auto" | "manual" | undefined;
      popoverTargetAction?: "toggle" | "show" | "hide" | undefined;
      popoverTarget?: string | undefined;

      // Living Standard
      /**
       * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/inert
       */
      inert?: boolean | undefined;
      /**
       * Hints at the type of data that might be entered by the user while editing the element or its contents
       * @see {@link https://html.spec.whatwg.org/multipage/interaction.html#input-modalities:-the-inputmode-attribute}
       */
      inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search" | undefined;
      /**
       * Specify that a standard HTML element should behave like a defined custom built-in element
       * @see {@link https://html.spec.whatwg.org/multipage/custom-elements.html#attr-is}
       */
      is?: string | undefined;
      /**
       * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/exportparts}
       */
      exportparts?: string | undefined;
      /**
       * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part}
       */
      part?: string | undefined;
    }

    interface AnchorHTMLAttributes extends HTMLAttributes {
      download?: any;
      href?: string | undefined;
      hrefLang?: string | undefined;
      media?: string | undefined;
      ping?: string | undefined;
      target?: HTMLAttributeAnchorTarget | undefined;
      type?: string | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
    }

    interface AudioHTMLAttributes extends MediaHTMLAttributes {}

    interface AreaHTMLAttributes extends HTMLAttributes {
      alt?: string | undefined;
      coords?: string | undefined;
      download?: any;
      href?: string | undefined;
      hrefLang?: string | undefined;
      media?: string | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
      shape?: string | undefined;
      target?: string | undefined;
    }

    interface BaseHTMLAttributes extends HTMLAttributes {
      href?: string | undefined;
      target?: string | undefined;
    }

    interface BlockquoteHTMLAttributes extends HTMLAttributes {
      cite?: string | undefined;
    }

    interface ButtonHTMLAttributes extends HTMLAttributes {
      disabled?: boolean | undefined;
      form?: string | undefined;
      formAction?:
        | string
        | ((formData: FormData) => void | Promise<void>)
        | undefined;
      formEncType?: string | undefined;
      formMethod?: string | undefined;
      formNoValidate?: boolean | undefined;
      formTarget?: string | undefined;
      name?: string | undefined;
      type?: "submit" | "reset" | "button" | undefined;
      value?: string | readonly string[] | number | undefined;
    }

    interface CanvasHTMLAttributes extends HTMLAttributes {
      height?: number | string | undefined;
      width?: number | string | undefined;
    }

    interface ColHTMLAttributes extends HTMLAttributes {
      span?: number | undefined;
      width?: number | string | undefined;
    }

    interface ColgroupHTMLAttributes extends HTMLAttributes {
      span?: number | undefined;
    }

    interface DataHTMLAttributes extends HTMLAttributes {
      value?: string | readonly string[] | number | undefined;
    }

    interface DetailsHTMLAttributes extends HTMLAttributes {
      open?: boolean | undefined;
      name?: string | undefined;
    }

    interface DelHTMLAttributes extends HTMLAttributes {
      cite?: string | undefined;
      dateTime?: string | undefined;
    }

    interface DialogHTMLAttributes extends HTMLAttributes {
      onCancel?: EventHandler | undefined;
      onClose?: EventHandler | undefined;
      open?: boolean | undefined;
    }

    interface EmbedHTMLAttributes extends HTMLAttributes {
      height?: number | string | undefined;
      src?: string | undefined;
      type?: string | undefined;
      width?: number | string | undefined;
    }

    interface FieldsetHTMLAttributes extends HTMLAttributes {
      disabled?: boolean | undefined;
      form?: string | undefined;
      name?: string | undefined;
    }

    interface FormHTMLAttributes extends HTMLAttributes {
      acceptCharset?: string | undefined;
      action?:
        | string
        | undefined
        | ((formData: FormData) => void | Promise<void>);
      autoComplete?: string | undefined;
      encType?: string | undefined;
      method?: string | undefined;
      name?: string | undefined;
      noValidate?: boolean | undefined;
      target?: string | undefined;
    }

    interface HtmlHTMLAttributes extends HTMLAttributes {
      manifest?: string | undefined;
    }

    interface IframeHTMLAttributes extends HTMLAttributes {
      allow?: string | undefined;
      allowFullScreen?: boolean | undefined;
      allowTransparency?: boolean | undefined;
      /** @deprecated */
      frameBorder?: number | string | undefined;
      height?: number | string | undefined;
      loading?: "eager" | "lazy" | undefined;
      /** @deprecated */
      marginHeight?: number | undefined;
      /** @deprecated */
      marginWidth?: number | undefined;
      name?: string | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
      sandbox?: string | undefined;
      /** @deprecated */
      scrolling?: string | undefined;
      seamless?: boolean | undefined;
      src?: string | undefined;
      srcDoc?: string | undefined;
      width?: number | string | undefined;
    }

    interface ImgHTMLAttributes extends HTMLAttributes {
      alt?: string | undefined;
      crossOrigin?: CrossOrigin;
      decoding?: "async" | "auto" | "sync" | undefined;
      fetchPriority?: "high" | "low" | "auto";
      height?: number | string | undefined;
      loading?: "eager" | "lazy" | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
      sizes?: string | undefined;
      src?:
        | string
        | undefined;
      srcSet?: string | undefined;
      useMap?: string | undefined;
      width?: number | string | undefined;
    }

    interface InsHTMLAttributes extends HTMLAttributes {
      cite?: string | undefined;
      dateTime?: string | undefined;
    }

    type HTMLInputTypeAttribute =
      | "button"
      | "checkbox"
      | "color"
      | "date"
      | "datetime-local"
      | "email"
      | "file"
      | "hidden"
      | "image"
      | "month"
      | "number"
      | "password"
      | "radio"
      | "range"
      | "reset"
      | "search"
      | "submit"
      | "tel"
      | "text"
      | "time"
      | "url"
      | "week"
      | (string & {});

    interface InputHTMLAttributes extends HTMLAttributes {
      accept?: string | undefined;
      alt?: string | undefined;
      autoComplete?: HTMLInputAutoCompleteAttribute | undefined;
      capture?: boolean | "user" | "environment" | undefined; // https://www.w3.org/TR/html-media-capture/#the-capture-attribute
      checked?: boolean | undefined;
      disabled?: boolean | undefined;
      form?: string | undefined;
      formAction?:
        | string
        | ((formData: FormData) => void | Promise<void>)
        | undefined;
      formEncType?: string | undefined;
      formMethod?: string | undefined;
      formNoValidate?: boolean | undefined;
      formTarget?: string | undefined;
      height?: number | string | undefined;
      list?: string | undefined;
      max?: number | string | undefined;
      maxLength?: number | undefined;
      min?: number | string | undefined;
      minLength?: number | undefined;
      multiple?: boolean | undefined;
      name?: string | undefined;
      pattern?: string | undefined;
      placeholder?: string | undefined;
      readOnly?: boolean | undefined;
      required?: boolean | undefined;
      size?: number | undefined;
      src?: string | undefined;
      step?: number | string | undefined;
      type?: HTMLInputTypeAttribute | undefined;
      value?: string | readonly string[] | number | undefined;
      width?: number | string | undefined;

      onChange?: ChangeEventHandler | undefined;
    }

    interface KeygenHTMLAttributes extends HTMLAttributes {
      challenge?: string | undefined;
      disabled?: boolean | undefined;
      form?: string | undefined;
      keyType?: string | undefined;
      keyParams?: string | undefined;
      name?: string | undefined;
    }

    interface LabelHTMLAttributes extends HTMLAttributes {
      form?: string | undefined;
      htmlFor?: string | undefined;
    }

    interface LiHTMLAttributes extends HTMLAttributes {
      value?: string | readonly string[] | number | undefined;
    }

    interface LinkHTMLAttributes extends HTMLAttributes {
      as?: string | undefined;
      crossOrigin?: CrossOrigin;
      fetchPriority?: "high" | "low" | "auto";
      href?: string | undefined;
      hrefLang?: string | undefined;
      integrity?: string | undefined;
      media?: string | undefined;
      imageSrcSet?: string | undefined;
      imageSizes?: string | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
      sizes?: string | undefined;
      type?: string | undefined;
      charSet?: string | undefined;

      // React props
      precedence?: string | undefined;
    }

    interface MapHTMLAttributes extends HTMLAttributes {
      name?: string | undefined;
    }

    interface MenuHTMLAttributes extends HTMLAttributes {
      type?: string | undefined;
    }

    interface MediaHTMLAttributes extends HTMLAttributes {
      autoPlay?: boolean | undefined;
      controls?: boolean | undefined;
      controlsList?: string | undefined;
      crossOrigin?: CrossOrigin;
      loop?: boolean | undefined;
      mediaGroup?: string | undefined;
      muted?: boolean | undefined;
      playsInline?: boolean | undefined;
      preload?: string | undefined;
      src?:
        | string
        | undefined;
    }

    interface MetaHTMLAttributes extends HTMLAttributes {
      charSet?: string | undefined;
      content?: string | undefined;
      httpEquiv?: string | undefined;
      media?: string | undefined;
      name?: string | undefined;
    }

    interface MeterHTMLAttributes extends HTMLAttributes {
      form?: string | undefined;
      high?: number | undefined;
      low?: number | undefined;
      max?: number | string | undefined;
      min?: number | string | undefined;
      optimum?: number | undefined;
      value?: string | readonly string[] | number | undefined;
    }

    interface QuoteHTMLAttributes extends HTMLAttributes {
      cite?: string | undefined;
    }

    interface ObjectHTMLAttributes extends HTMLAttributes {
      classID?: string | undefined;
      data?: string | undefined;
      form?: string | undefined;
      height?: number | string | undefined;
      name?: string | undefined;
      type?: string | undefined;
      useMap?: string | undefined;
      width?: number | string | undefined;
      wmode?: string | undefined;
    }

    interface OlHTMLAttributes extends HTMLAttributes {
      reversed?: boolean | undefined;
      start?: number | undefined;
      type?: "1" | "a" | "A" | "i" | "I" | undefined;
    }

    interface OptgroupHTMLAttributes extends HTMLAttributes {
      disabled?: boolean | undefined;
      label?: string | undefined;
    }

    interface OptionHTMLAttributes extends HTMLAttributes {
      disabled?: boolean | undefined;
      label?: string | undefined;
      selected?: boolean | undefined;
      value?: string | readonly string[] | number | undefined;
    }

    interface OutputHTMLAttributes extends HTMLAttributes {
      form?: string | undefined;
      htmlFor?: string | undefined;
      name?: string | undefined;
    }

    interface ParamHTMLAttributes extends HTMLAttributes {
      name?: string | undefined;
      value?: string | readonly string[] | number | undefined;
    }

    interface ProgressHTMLAttributes extends HTMLAttributes {
      max?: number | string | undefined;
      value?: string | readonly string[] | number | undefined;
    }

    interface SlotHTMLAttributes extends HTMLAttributes {
      name?: string | undefined;
    }

    interface ScriptHTMLAttributes extends HTMLAttributes {
      async?: boolean | undefined;
      /** @deprecated */
      charSet?: string | undefined;
      crossOrigin?: CrossOrigin;
      defer?: boolean | undefined;
      integrity?: string | undefined;
      noModule?: boolean | undefined;
      referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
      src?: string | undefined;
      type?: string | undefined;
    }

    interface SelectHTMLAttributes extends HTMLAttributes {
      autoComplete?: string | undefined;
      disabled?: boolean | undefined;
      form?: string | undefined;
      multiple?: boolean | undefined;
      name?: string | undefined;
      required?: boolean | undefined;
      size?: number | undefined;
      value?: string | readonly string[] | number | undefined;
      onChange?: ChangeEventHandler | undefined;
    }

    interface SourceHTMLAttributes extends HTMLAttributes {
      height?: number | string | undefined;
      media?: string | undefined;
      sizes?: string | undefined;
      src?: string | undefined;
      srcSet?: string | undefined;
      type?: string | undefined;
      width?: number | string | undefined;
    }

    interface StyleHTMLAttributes extends HTMLAttributes {
      media?: string | undefined;
      scoped?: boolean | undefined;
      type?: string | undefined;

      // React props
      href?: string | undefined;
      precedence?: string | undefined;
    }

    interface TableHTMLAttributes extends HTMLAttributes {
      align?: "left" | "center" | "right" | undefined;
      bgcolor?: string | undefined;
      border?: number | undefined;
      cellPadding?: number | string | undefined;
      cellSpacing?: number | string | undefined;
      frame?: boolean | undefined;
      rules?: "none" | "groups" | "rows" | "columns" | "all" | undefined;
      summary?: string | undefined;
      width?: number | string | undefined;
    }

    interface TextareaHTMLAttributes extends HTMLAttributes {
      autoComplete?: string | undefined;
      cols?: number | undefined;
      dirName?: string | undefined;
      disabled?: boolean | undefined;
      form?: string | undefined;
      maxLength?: number | undefined;
      minLength?: number | undefined;
      name?: string | undefined;
      placeholder?: string | undefined;
      readOnly?: boolean | undefined;
      required?: boolean | undefined;
      rows?: number | undefined;
      value?: string | readonly string[] | number | undefined;
      wrap?: string | undefined;

      onChange?: ChangeEventHandler | undefined;
    }

    interface TdHTMLAttributes extends HTMLAttributes {
      align?: "left" | "center" | "right" | "justify" | "char" | undefined;
      colSpan?: number | undefined;
      headers?: string | undefined;
      rowSpan?: number | undefined;
      scope?: string | undefined;
      abbr?: string | undefined;
      height?: number | string | undefined;
      width?: number | string | undefined;
      valign?: "top" | "middle" | "bottom" | "baseline" | undefined;
    }

    interface ThHTMLAttributes extends HTMLAttributes {
      align?: "left" | "center" | "right" | "justify" | "char" | undefined;
      colSpan?: number | undefined;
      headers?: string | undefined;
      rowSpan?: number | undefined;
      scope?: string | undefined;
      abbr?: string | undefined;
    }

    interface TimeHTMLAttributes extends HTMLAttributes {
      dateTime?: string | undefined;
    }

    interface TrackHTMLAttributes extends HTMLAttributes {
      default?: boolean | undefined;
      kind?: string | undefined;
      label?: string | undefined;
      src?: string | undefined;
      srcLang?: string | undefined;
    }

    interface VideoHTMLAttributes extends MediaHTMLAttributes {
      height?: number | string | undefined;
      playsInline?: boolean | undefined;
      poster?: string | undefined;
      width?: number | string | undefined;
      disablePictureInPicture?: boolean | undefined;
      disableRemotePlayback?: boolean | undefined;

      onResize?: EventHandler | undefined;
      onResizeCapture?: EventHandler | undefined;
    }

    interface WebViewHTMLAttributes extends HTMLAttributes {
      allowFullScreen?: boolean | undefined;
      allowpopups?: boolean | undefined;
      autosize?: boolean | undefined;
      blinkfeatures?: string | undefined;
      disableblinkfeatures?: string | undefined;
      disableguestresize?: boolean | undefined;
      disablewebsecurity?: boolean | undefined;
      guestinstance?: string | undefined;
      httpreferrer?: string | undefined;
      nodeintegration?: boolean | undefined;
      partition?: string | undefined;
      plugins?: boolean | undefined;
      preload?: string | undefined;
      src?: string | undefined;
      useragent?: string | undefined;
      webpreferences?: string | undefined;
    }

    /**
     * Defines the allowed properties for intrinsic HTML elements.
     * Using Record<string, any> is the bare minimum.
     * @ref https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/react/index.d.ts
     */
    interface IntrinsicElements {
      // HTML
      a: AnchorHTMLAttributes;
      abbr: HTMLAttributes;
      address: HTMLAttributes;
      area: AreaHTMLAttributes;
      article: HTMLAttributes;
      aside: HTMLAttributes;
      audio: AudioHTMLAttributes;
      b: HTMLAttributes;
      base: BaseHTMLAttributes;
      bdi: HTMLAttributes;
      bdo: HTMLAttributes;
      big: HTMLAttributes;
      blockquote: BlockquoteHTMLAttributes;
      body: HTMLAttributes;
      br: HTMLAttributes;
      button: ButtonHTMLAttributes;
      canvas: CanvasHTMLAttributes;
      caption: HTMLAttributes;
      center: HTMLAttributes;
      cite: HTMLAttributes;
      code: HTMLAttributes;
      col: ColHTMLAttributes;
      colgroup: ColgroupHTMLAttributes;
      data: DataHTMLAttributes;
      datalist: HTMLAttributes;
      dd: HTMLAttributes;
      del: DelHTMLAttributes;
      details: DetailsHTMLAttributes;
      dfn: HTMLAttributes;
      dialog: DialogHTMLAttributes;
      div: HTMLAttributes;
      dl: HTMLAttributes;
      dt: HTMLAttributes;
      em: HTMLAttributes;
      embed: EmbedHTMLAttributes;
      fieldset: FieldsetHTMLAttributes;
      figcaption: HTMLAttributes;
      figure: HTMLAttributes;
      footer: HTMLAttributes;
      form: FormHTMLAttributes;
      h1: HTMLAttributes;
      h2: HTMLAttributes;
      h3: HTMLAttributes;
      h4: HTMLAttributes;
      h5: HTMLAttributes;
      h6: HTMLAttributes;
      head: HTMLAttributes;
      header: HTMLAttributes;
      hgroup: HTMLAttributes;
      hr: HTMLAttributes;
      html: HtmlHTMLAttributes;
      i: HTMLAttributes
      iframe: IframeHTMLAttributes;
      img: ImgHTMLAttributes;
      input: InputHTMLAttributes;
      ins: InsHTMLAttributes;
      kbd: HTMLAttributes;
      keygen: KeygenHTMLAttributes;
      label: LabelHTMLAttributes;
      legend: HTMLAttributes;
      li: LiHTMLAttributes;
      link: LinkHTMLAttributes;
      main: HTMLAttributes;
      map: MapHTMLAttributes;
      mark: HTMLAttributes;
      menu: MenuHTMLAttributes;
      menuitem: HTMLAttributes;
      meta: MetaHTMLAttributes;
      meter: MeterHTMLAttributes;
      nav: HTMLAttributes;
      noindex: HTMLAttributes;
      noscript: HTMLAttributes;
      object: ObjectHTMLAttributes;
      ol: OlHTMLAttributes;
      optgroup: OptgroupHTMLAttributes;
      option: OptionHTMLAttributes;
      output: OutputHTMLAttributes;
      p: HTMLAttributes;
      param: ParamHTMLAttributes;
      picture: HTMLAttributes;
      pre: HTMLAttributes;
      progress: ProgressHTMLAttributes;
      q: QuoteHTMLAttributes;
      rp: HTMLAttributes;
      rt: HTMLAttributes;
      ruby: HTMLAttributes;
      s: HTMLAttributes;
      samp: HTMLAttributes;
      search: HTMLAttributes;
      slot: SlotHTMLAttributes;
      script: ScriptHTMLAttributes;
      section: HTMLAttributes;
      select: SelectHTMLAttributes;
      small: HTMLAttributes;
      source: SourceHTMLAttributes;
      span: HTMLAttributes;
      strong: HTMLAttributes;
      style: StyleHTMLAttributes;
      sub: HTMLAttributes;
      summary: HTMLAttributes;
      sup: HTMLAttributes;
      table: TableHTMLAttributes;
      template: HTMLAttributes;
      tbody: HTMLAttributes;
      td: TdHTMLAttributes;
      textarea: TextareaHTMLAttributes;
      tfoot: HTMLAttributes;
      th: ThHTMLAttributes;
      thead: HTMLAttributes;
      time: TimeHTMLAttributes;
      title: HTMLAttributes;
      tr: HTMLAttributes;
      track: TrackHTMLAttributes;
      u: HTMLAttributes
      ul: HTMLAttributes;
      "var": HTMLAttributes
      video: VideoHTMLAttributes;
      wbr: HTMLAttributes;
      webview: WebViewHTMLAttributes;
      [Fragment]: XinDefaultAttributes;
      [elem_name: string]: HTMLAttributes & XinDefaultAttributes; // handle custom elements
    }
  }   
}

export type { FC };
export type { XinRenderableChild };
