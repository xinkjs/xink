import type {
  BaseEvent, RequestContext as InternalRequestContext,
  Handler as InternalHandler, Hook as InternalHook, SchemaDefinition,
  HandlerMethod, HookMethod, Matcher,
  MatcherResult,
  MixedResult,
  ParsedSegment,
  StoreResult
} from './internal-types'

export type RequestContext<Path extends string, TContext extends BaseEvent, TSchema = unknown> = InternalRequestContext<Path, TContext, TSchema>;
export type Handler<Path extends string, TContext extends BaseEvent, TSchema = unknown> = InternalHandler<Path, TContext, TSchema>;
export type Hook<Path extends string, TContext extends BaseEvent, TSchema = unknown> = InternalHook<Path, TContext, TSchema>;

export declare class Store<Path extends string = string, TEvent extends BaseEvent = BaseEvent> {
  constructor()

  getHandler(method: string): Handler<Path, TEvent, unknown> | undefined;
  getHooks(method: HookMethod): Hook<Path, TEvent, unknown>[] | undefined;
  getMethods(): string[];
  hasMethod(method: string): boolean;
  getSchemas(method: HandlerMethod): SchemaDefinition | undefined;

  /**
   * Sets route-level hooks.
   * @param hooks A comma-separated list of hook functions.
   */
  hook<TSchema = unknown>(...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;

  // HTTP methods, with overloads to accomodate schemas
  get<TSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  get<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  post<TSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  post<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  put<TSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  put<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  patch<TSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  patch<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  delete<TSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  delete<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  head<TSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  head<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  optins<TSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  options<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  fallback<TSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
  fallback<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): Store<Path, TEvent>;
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
