import type { Router as URLRouter, Handler, Hook, SchemaDefinition, Store, ValidData } from "@xinkjs/xi"
import type { SerializeOptions, ParseOptions } from 'cookie'
import type { ApiReferenceConfiguration } from '@scalar/types'

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

export interface RequestEvent extends BaseEvent {
  cookies: Cookies;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  html: typeof html;
  json: (data: any, init?: ResponseInit) => Response;
  locals: Api.Locals;
  params: Record<string, string | undefined>;
  platform: Record<string, any>;
  redirect: typeof redirect;
  request: Request;
  setHeaders: (headers: Record<string, any>) => void;
  store: Store | null;
  text: typeof text;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  valid?: Record<string, any | undefined>;
}

export type ErrorHandler = (error: unknown, event?: RequestEvent) => MaybePromise<Response | void>;
export type NotFoundHandler = (event?: RequestEvent) => MaybePromise<Response | void>;
export type Handle = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>;
export type MaybePromise<T> = T | Promise<T>;
export type ResolveEvent = (event: RequestEvent) => MaybePromise<Response>;
export type Route = { store: Store; params: Record<string, string | undefined>; } | null;
export type PlatformContext = Record<string, any>;
export interface CloudflarePlatformContext {
  env?: Record<string, any>;
  ctx?: {
    waitUntil?: (promise: Promise<any>) => void;
    passThroughOnException?: () => void;
  };
};

export declare class Router extends URLRouter<RequestEvent> {
  fetch(request: Request, platform?: PlatformContext);
  getMiddleware(): Handle[];
  onError(handler: ErrorHandler): void;
  onNotFound(handler: NotFoundHandler): void;
  openapi(metadata: { 
    path: string; 
    data?: {
      openapi?: string;
      info?: {
        title?: string;
        version?: string;
      }
    },
    scalar?: Partial<ApiReferenceConfiguration>
  }): void;
  route<Path extends string>(path: Path, openapi?: Record<string, any>): Store<Path, RequestEvent>;
  use(...middleware: Handle[]): void;
};

export function html(data: any, init?: ResponseInit | undefined): Response;
export function json(data: any, init?: ResponseInit | undefined): Response;
export function redirect(status: number, location: string): never;
export function text(data: string, init?: ResponseInit | undefined): Response;

export { Handler, Hook, SchemaDefinition, Store, ApiReferenceConfiguration };

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
