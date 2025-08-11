import type {
  BaseEvent, RequestContext as InternalRequestContext,
  Handler as InternalHandler, Hook as InternalHook, SchemaDefinition as InternalSchemaDefinition,
  HandlerMethod, HookMethod, Matcher,
  MatcherResult,
  MixedResult,
  ParsedSegment,
  StoreResult
} from './internal-types'

export type SchemaDefinition = InternalSchemaDefinition;
export type RequestContext<Path extends string, TContext extends BaseEvent, TSchema = unknown, ResSchema = unknown> = InternalRequestContext<Path, TContext, TSchema, ResSchema>;
export type Handler<Path extends string, TContext extends BaseEvent, TSchema = unknown, ResSchema = unknown> = InternalHandler<Path, TContext, TSchema, ResSchema>;
export type Hook<Path extends string, TContext extends BaseEvent, TSchema = unknown, ResSchema = unknown> = InternalHook<Path, TContext, TSchema, ResSchema>;

export declare class Store<Path extends string = string, TEvent extends BaseEvent = BaseEvent> {
  constructor()

  getHandler(method: string): Handler<Path, TEvent, unknown, unknown> | undefined;
  getHooks(method: HookMethod): Hook<Path, TEvent, unknown, unknown>[] | undefined;
  getMethods(): string[];
  hasMethod(method: string): boolean;
  getSchemas(method: HandlerMethod): SchemaDefinition | undefined;

  /**
   * Sets route-level hooks.
   * @param hooks A comma-separated list of hook functions.
   */
  hook<TSchema = unknown>(...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;

  // HTTP methods, with overloads to accomodate schemas
  get<TSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema, ResSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  get<TSchema = unknown, ResSchema = unknown>(handler: Handler<Path, TEvent, TSchema, ResSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  post<TSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  post<TSchema = unknown, ResSchema = unknown>(handler: Handler<Path, TEvent, TSchema, ResSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  put<TSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  put<TSchema = unknown, ResSchema = unknown>(handler: Handler<Path, TEvent, TSchema, ResSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  patch<TSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  patch<TSchema = unknown, ResSchema = unknown>(handler: Handler<Path, TEvent, TSchema, ResSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  delete<TSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  delete<TSchema = unknown, ResSchema = unknown>(handler: Handler<Path, TEvent, TSchema, ResSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  head<TSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  head<TSchema = unknown, ResSchema = unknown>(handler: Handler<Path, TEvent, TSchema, ResSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  optins<TSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  options<TSchema = unknown, ResSchema = unknown>(handler: Handler<Path, TEvent, TSchema, ResSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  fallback<TSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
  fallback<TSchema = unknown, ResSchema = unknown>(handler: Handler<Path, TEvent, TSchema, ResSchema>, ...hooks: Hook<Path, TEvent, TSchema, ResSchema>[]): Store<Path, TEvent>;
}

export declare class Router<TEvent extends BaseEvent = BaseEvent> {
  constructor()

  basepath(path: string): void;
  getRoutes(): { pattern: string, methods: string[] }[];
  matcher(name: string, matcher: Matcher): void;
  matchMatcherSegment(pattern: string, segment: string): MatcherResult;
  matchMixedSegment(pattern: string, segment: string): MixedResult;
  matchRoute(node: Node, segments: string[], index: number, params: Record<string, string | undefined>): StoreResult;
  parseSegment(segment: string): ParsedSegment;
  route<Path extends string>(path: Path): Store<Path, TEvent>;
  find(path: string): StoreResult;
}
