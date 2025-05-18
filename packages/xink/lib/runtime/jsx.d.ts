import type { isVNode } from "./jsx.js";
import type { XinkRenderableChild } from "../../types.js"

export interface XinkVNode {
  type: symbol;
  tag: string | symbol | Function;
  props: JsxProps;
  key?: string | number | undefined;
}

// Define the type for props, including children
export interface JsxProps extends Record<string, any>{
  children?: XinkRenderableChild | XinkRenderableChild[];
  key?: string | number | undefined;
}

export const Fragment: unique symbol;

export declare function jsx(
  tag: string | symbol | Function,
  props: JsxProps,
  key?: string | number | undefined
): XinkVNode;

export declare function jsxDEV(
  tag: string | symbol | Function,
  props: JsxProps,
  key?: string | number | undefined,
  isStaticChildren?: boolean,
  sourceDebugInfo?: {
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
  },
  thisArg?: any
): XinkVNode;

export declare function jsxs(
  tag: string | symbol | Function,
  props: JsxProps,
  key?: string | number | undefined
): XinkVNode;

export declare function isVNode(value: any): value is XinkVNode;
