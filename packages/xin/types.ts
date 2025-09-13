import type { BaseStore, XiConfig } from "@xinkjs/xi"
import type { SerializeOptions, ParseOptions } from 'cookie'
import type { ApiReferenceConfiguration } from '@scalar/types'
import type { OpenAPIV3 } from "@scalar/types"
import type { html, redirect, text } from "./lib/runtime/helpers"
import type { XinVNode } from "./lib/runtime/jsx.js"

declare global {
  namespace Api {
    interface Locals {}
  }
}

// A utility to split a path string into an array of segments at the type level
type PathSegments<Path extends string> =
  Path extends `${infer Segment}/${infer Rest}`
    ? Segment extends '' // Handle leading slash
      ? PathSegments<Rest>
      : [Segment, ...PathSegments<Rest>]
    : [Path];

// A utility to extract a param name from a single segment
type ParamNameFromSegment<Segment extends string> =
  Segment extends `:${infer Param}=${string}` /* matcher */ ? Param :
  Segment extends `${string}:${infer Param}` /* mixed */ ? Param :
  Segment extends `:${infer Param}` /* dynamic */ ? Param :
  Segment extends `*${infer Param}` /* wildcard */ ? Param :
  never;

// The main parser: maps over the segments and builds the params object
export type ParsePath<Path extends string> = {
  [Segment in PathSegments<Path>[number] as ParamNameFromSegment<Segment>]: string
};

export type SchemaDefinition = {
  form?: Record<string, any>;
  json?: Record<string, any>;
  params?: Record<string, any>;
  query?: Record<string, any>;
}

export type ResponseT<T> = Response & {
  readonly __resSchema: T;
}

export type BasicRouteInfo = { pattern: string; methods: string[], store: Store }[]

/** Utility type representing a value that may or may not be a Promise. */
export type MaybePromise<T> = T | Promise<T>;

export type Handler<
  ReqSchema extends SchemaDefinition = SchemaDefinition,
  ResSchema = unknown,
  Path = unknown, 
> = (event: RequestEvent<ReqSchema, ResSchema, Path>) => MaybePromise<unknown extends ResSchema ? Response | XinVNode | string | number | Record<string, any> | null | undefined : ResponseT<ResSchema> | ResSchema>;
export type Hook<
  ReqSchema extends SchemaDefinition = SchemaDefinition,
  ResSchema extends unknown = unknown,
  Path = unknown, 
> = (event: RequestEvent<ReqSchema, ResSchema, Path>, next?: () => MaybePromise<void>) => MaybePromise<void>;
export type HandlerMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'FALLBACK';
export type HookMethod = HandlerMethod | 'ALL';

export type StoreResult = { store: Store | null; params: Record<string, string | undefined> }

export declare class Store<Path extends string = string, ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown> implements BaseStore {
  setHandler(method: HandlerMethod, handler: Handler<ReqSchema, ResSchema, Path>): void;
  getHandler(method: HandlerMethod): Handler<ReqSchema, ResSchema, Path> | undefined;
  setHooks(method: HookMethod, hooks: Hook<ReqSchema, ResSchema, Path>[]): void;
  getHooks(method: HookMethod): Hook<ReqSchema, ResSchema, Path>[] | undefined;
  getMethods(): string[];
  setSchema(method: HandlerMethod, schema: SchemaDefinition): void;
  getSchema(method: HandlerMethod): SchemaDefinition | undefined;

  /**
   * Sets route-level hooks.
   * @param hooks A comma-separated list of hook functions.
   */
  hook(...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;

  get<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  get<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  post<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  post<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  put<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  put<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  patch<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  patch<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  delete<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  delete<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  head<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  head<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  options<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  options<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  fallback<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
  fallback<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown>(handler: Handler<ReqSchema, ResSchema, Path>, ...hooks: Hook<ReqSchema, ResSchema, Path>[]): Store<Path, ReqSchema, ResSchema>;
}

export interface XinConfig extends XiConfig {
  check_origin: boolean;
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

/** The minimal constraint for a custom context object. */
export type BaseEvent = object;

export interface RequestEvent<ReqSchema extends SchemaDefinition = SchemaDefinition, ResSchema = unknown, Path = unknown> extends BaseEvent {
  cookies: Cookies;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  html: typeof html;
  json: (data: ResSchema, init?: ResponseInit) => ResponseT<ResSchema>;
  locals: Api.Locals;
  params: Path extends string ? ParsePath<Path> : Record<string, string | undefined>;
  platform: Record<string, any>;
  redirect: typeof redirect;
  request: Request;
  setHeaders: (headers: Record<string, any>) => void;
  store: Store | null;
  text: typeof text;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  valid: ReqSchema;
}

export type ErrorHandler = (error: unknown, event?: RequestEvent) => MaybePromise<Response>;
export type NotFoundHandler = (event?: RequestEvent) => MaybePromise<Response>;
export type Handle = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>;

export interface OpenApiMetadata {
  openapi?: string; 
  info?: { title?: string; version?: string};
}
// What is passed in via .openapi()
export interface OpenApiOptions {
  path: string;
  metadata?: OpenApiMetadata;
  scalar?: Partial<ApiReferenceConfiguration>;
}
// What gets stored in the Router
export interface OpenApiConfig {
  path: string;
  paths: Record<string, any>;
  metadata: OpenApiMetadata;
  scalar: Partial<ApiReferenceConfiguration>;    
}
// OpenAPI spec
export interface OpenApiData extends OpenAPIV3.PathItemObject {
  tags?: string[];
}
export type ResolveEvent = (event: RequestEvent) => MaybePromise<Response>;
export type Route = { store: Store; params: Record<string, string | undefined>; } | null;

export interface CloudflareContext {
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
};
export interface CloudflarePlatform<Env extends Record<string, any> = Record<string, any>> {
  env: Env,
  ctx: CloudflareContext
};

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
