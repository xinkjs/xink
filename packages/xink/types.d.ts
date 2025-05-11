import type { Store, Params, Router } from '@xinkjs/xin'
import type { SerializeOptions, ParseOptions } from 'cookie'
import type { Plugin } from 'vite'
import type { Config } from './lib/types/internal'

type AtLeastOne<T, P> = { [K in keyof T]: Pick<T, K> }[keyof T]
interface AllowedValidatorTypes {
  form?: any;
  json?: any;
  params?: any;
  query?: any;
}
export interface Context {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}
export type Cookie = {
  name: string;
  value: string;
  options: SerializeOptions;
}
export type Cookies = {
  delete(name: string, options?: SerializeOptions): void;
  get(name: string, options?: ParseOptions): string | undefined;
  getAll(options?: ParseOptions): Array<{ name: string, value: string }>;
  set(name: string, value: string, options?: SerializeOptions): void;
}
export type ErrorHandler = (error: unknown, event?: RequestEvent) => MaybePromise<Response | void>;
export type Handle = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>;
export type MaybePromise<T> = T | Promise<T>;
export type Middleware = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>;
export interface RequestEvent<V extends AllowedValidatorTypes = AllowedValidatorTypes> {
  context: { env: Env.Bindings, ctx: Context } | null,
  cookies: Cookies;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  html: typeof html;
  json: typeof json;
  locals: Api.Locals;
  params: Params;
  redirect: typeof redirect;
  request: Request;
  store: Store | null;
  setHeaders: (headers: { [key: string]: any; }) => void;
  text: typeof text;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  valid: V;
}
export type ResolveEvent = (event: RequestEvent) => MaybePromise<Response>;

export interface Schemas {
  get?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  post?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  put?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  patch?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  delete?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  head?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  options?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  default?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
}
export interface Validators {
  get?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  post?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  put?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  patch?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  delete?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  head?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  options?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  default?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
}
export interface XinkAdaptContext {
  entrypoint: string;
  out_dir: string;
  api_chunk_filename: string;
  log: (msg: string) => void;
  vite_root: string;
  xink_config: Config;
}
export interface XinkAdapter {
  name: string;
  adapt: (context: XinkAdaptContext) => Promise<void> | void;
}
export type XinkConfig = {
  adapter: (options?: any) => XinkAdapter;
  check_origin?: boolean;
  entrypoint?: string; 
  out_dir?: string;
  serve_options?: { [key: string]: any; };
}

export interface PlatformContext {
  env?: Record<string, any>;
  ctx?: {
    waitUntil?: (promise: Promise<any>) => void;
    passThroughOnException?: () => void;
  };
}

export function xink(xink_config?: XinkConfig): Promise<Plugin>;
export function html(data: any, init?: ResponseInit | undefined): Response;
export function json(data: any, init?: ResponseInit | undefined): Response;
export function redirect(status: number, location: string): never;
export function text(data: string, init?: ResponseInit | undefined): Response;
export function sequence(...handlers: Handle[]): Handle;
export class Xink extends Router {
  constructor()
  fetch(request: Request, context?: PlatformContext): Promise<Response>;
  init(basepath?: string): Promise<void>;
  openapi(metadata: { 
    path: string; 
    data?: {
      "openapi": string;
      "info": {
        "title": string;
        "version": string;
      }
    }
  }): void;
  path(path: string): void;
}

export class StandardSchemaError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options)
  }
};

/* STANDARD SCHEMA */
/** The Standard Schema interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
/** The Standard Schema properties. */
readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

export declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  export interface Props<Input = unknown, Output = Input> {
      /** The version number of the standard. */
      readonly version: 1;
      /** The vendor name of the schema library. */
      readonly vendor: string;
      /** Validates unknown input values. */
      readonly validate: (
      value: unknown
      ) => Result<Output> | Promise<Result<Output>>;
      /** Inferred types associated with the schema. */
      readonly types?: Types<Input, Output> | undefined;
  }

  /** The result interface of the validate function. */
  export type Result<Output> = SuccessResult<Output> | FailureResult;

  /** The result interface if validation succeeds. */
  export interface SuccessResult<Output> {
      /** The typed output value. */
      readonly value: Output;
      /** The non-existent issues. */
      readonly issues?: undefined;
  }

  /** The result interface if validation fails. */
  export interface FailureResult {
      /** The issues of failed validation. */
      readonly issues: ReadonlyArray<Issue>;
  }

  /** The issue interface of the failure output. */
  export interface Issue {
      /** The error message of the issue. */
      readonly message: string;
      /** The path of the issue, if any. */
      readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  /** The path segment interface of the issue. */
  export interface PathSegment {
      /** The key representing a path segment. */
      readonly key: PropertyKey;
  }

  /** The Standard Schema types interface. */
  export interface Types<Input = unknown, Output = Input> {
      /** The input type of the schema. */
      readonly input: Input;
      /** The output type of the schema. */
      readonly output: Output;
  }

  /** Infers the input type of a Standard Schema. */
  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
      Schema['~standard']['types']
  >['input'];

  /** Infers the output type of a Standard Schema. */
  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
      Schema['~standard']['types']
  >['output'];
}

class XinkVNode {
  type;
  tag;
  props;
  key;

  constructor(tag, props, key)
}

// Make the JSX namespace available globally for TSX files
declare global {
  namespace JSX {
      /**
       * Represents a JSX element structure.
       * Corresponds to the return type of the jsx/jsxs functions.
       */
      type Element = XinkVNode;

      /**
       * Defines the allowed properties for intrinsic HTML elements.
       * Using Record<string, any> is the bare minimum.
       * A full implementation would list all standard HTML tags and their specific attributes.
       * See libraries like [at]types/react for comprehensive examples.
       */
      interface IntrinsicElements {
          // Allow any standard HTML tag with any properties
          [elem_mame: string]: Record<string, any>;

          // Example of specific typing (better DX):
          // div: { id?: string; class?: string; children?: any; style?: Record<string, string>; onClick?: Function };
          // a: { href?: string; target?: string; children?: any; };
          // img: { src?: string; alt?: string; width?: number; height?: number; };
      }

      // You might need to define ElementAttributesProperty and ElementChildrenAttribute
      // if your runtime handles props differently, but defaults often work.
      // interface ElementAttributesProperty { props: {}; }
      // interface ElementChildrenAttribute { children: {}; }
  }
}

// Define the type for props, including children
type JsxProps = Record<string, any> & { children?: any };

export const Fragment: unique symbol;

export function jsx(
  tag: string | symbol | Function,
  props: JsxProps,
  key?: string | number | undefined
): XinkVNode;

export function jsxDEV(
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

export function jsxs(
  tag: string | symbol | Function,
  props: JsxProps,
  key?: string | number | undefined
): XinkVNode;
