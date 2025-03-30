import type { Store, Params, Router } from "@xinkjs/xin"
import type { SerializeOptions, ParseOptions } from "cookie"
import type { Plugin } from 'vite'
import type { Config } from "./lib/types/internal"

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
  cookies: Cookies;
  ctx: Context;
  env: Env.Bindings;
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

export interface Validators {
  GET?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  POST?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  PUT?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  PATCH?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  DELETE?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  HEAD?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  OPTIONS?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  default?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
}
export interface XinkAdaptContext {
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
  adapter?: (options?: any) => XinkAdapter;
  check_origin?: boolean;
  entrypoint?: string; 
  out_dir?: string;
}

export function xink(xink_config?: XinkConfig): Promise<Plugin>;
export function html(data: any, init?: ResponseInit | undefined): Response;
export function json(data: any, init?: ResponseInit | undefined): Response;
export function redirect(status: number, location: string): never;
export function text(data: string, init?: ResponseInit | undefined): Response;
export function sequence(...handlers: Handle[]): Handle;
export class Xink extends Router {
  constructor()
  fetch(request: Request, env?: Env.Bindings, ctx?: Context): Promise<Response>;
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
