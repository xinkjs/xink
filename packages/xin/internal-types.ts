import type { BaseStore } from "@xinkjs/xi"
import type { RequestEvent } from "./types.js"

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

export type Handler<
  ReqSchema extends SchemaDefinition = SchemaDefinition,
  ResSchema extends unknown = unknown,
  Path extends string = string, 
> = (event: RequestEvent<ReqSchema, ResSchema, Path>) => MaybePromise<ResSchema extends unknown ? Response<any> : Response<ResSchema>>;
export type Hook<
  ReqSchema extends SchemaDefinition = SchemaDefinition,
  ResSchema extends unknown = unknown,
  Path extends string = string, 
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
