import type { BaseStore } from "@xinkjs/xi"

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

/** The minimal constraint for a custom context object. */
export type BaseEvent = object;

export type SchemaDefinition = {
  form?: Record<string, any>;
  json?: Record<string, any>;
  params?: Record<string, any>;
  query?: Record<string, any>;
}

export type Response<T = unknown> = {
  body?: T,
  init?: { 
    status?: number;
    statusText?: string;
    headers?: Record<string, any>;
  }
}

export type BasicRouteInfo = { pattern: string; methods: string[], store: Store }[]
export type MaybePromise<T> = T | Promise<T>;

/**
 * The final, fully-formed context object passed to handlers and hooks.
 * It's an intersection of the user-provided context (`ReqEvent`)
 * and the dynamically parsed route parameters.
 */
export type RequestContext<
  Path extends string,
  ReqEvent extends BaseEvent,
  ReqSchema = unknown,
  ResSchema = unknown
> = Omit<ReqEvent, 'params' | 'valid'> & { // remove possible params and valid keys defined from higher-level router
  params: ParsePath<Path>;
  json: (data: ResSchema, init?: ResponseInit) => Response;
  valid: ReqSchema;
};

export type Handler<
  Path extends string = string, 
  ReqEvent extends BaseEvent = BaseEvent,
  ReqSchema = unknown,
  ResSchema extends unknown = unknown,
> = (event: RequestContext<Path, ReqEvent, ReqSchema, ResSchema>) => MaybePromise<ResSchema extends unknown ? Response<any> : Response<ResSchema>>;
export type Hook<
  Path extends string = string, 
  ReqEvent extends BaseEvent = BaseEvent,
  ReqSchema = unknown,
  ResSchema = unknown
> = (event: RequestContext<Path, ReqEvent, ReqSchema, ResSchema>, next?: () => MaybePromise<void>) => MaybePromise<void>;
export type HandlerMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'FALLBACK';
export type HookMethod = HandlerMethod | 'ALL';

export type StoreResult = { store: Store | null; params: Record<string, string | undefined> }

export declare class Store<Path extends string = string, ReqEvent extends BaseEvent = BaseEvent> implements BaseStore {
  setHooks<ReqSchema, ResSchema>(method: HookMethod, hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): void;
  getHooks(method: HookMethod): Hook<Path, ReqEvent, unknown, unknown>[] | undefined;
  setSchema(method: HandlerMethod, schema: SchemaDefinition): void;
  getSchema(method: HandlerMethod): SchemaDefinition | undefined;

  /**
   * Sets route-level hooks.
   * @param hooks A comma-separated list of hook functions.
   */
  hook<ReqSchema = unknown>(...hooks: Hook<Path, ReqEvent, ReqSchema>[]): Store<Path, ReqEvent>;

  get<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  get<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  post<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  post<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  put<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  put<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  patch<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  patch<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  delete<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  delete<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  head<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  head<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  options<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  options<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  fallback<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  fallback<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
}
