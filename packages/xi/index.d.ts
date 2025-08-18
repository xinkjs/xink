import type {
  BaseEvent, RequestContext as InternalRequestContext,
  Handler as InternalHandler, Hook as InternalHook, SchemaDefinition as InternalSchemaDefinition,
  HandlerMethod, HookMethod, Matcher,
  MatcherResult,
  MixedResult,
  ParsedSegment,
  StoreResult,
  XiConfig as InternalXiConfig
} from './internal-types'

export type XiConfig = InternalXiConfig
export type SchemaDefinition = InternalSchemaDefinition;
export type RequestContext<Path extends string, ReqContext extends BaseEvent, ReqSchema = unknown, ResSchema = unknown> = InternalRequestContext<Path, ReqContext, ReqSchema, ResSchema>;
export type Handler<Path extends string, ReqContext extends BaseEvent, ReqSchema = unknown, ResSchema = unknown> = InternalHandler<Path, ReqContext, ReqSchema, ResSchema>;
export type Hook<Path extends string, ReqContext extends BaseEvent, ReqSchema = unknown, ResSchema = unknown> = InternalHook<Path, ReqContext, ReqSchema, ResSchema>;

export declare class Store<Path extends string = string, ReqEvent extends BaseEvent = BaseEvent> {
  constructor()

  setHandler<ReqSchema, ResSchema>(method: HandlerMethod, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>): void;
  getHandler(method: string): Handler<Path, ReqEvent, unknown, unknown> | undefined;
  setHooks<ReqSchema, ResSchema>(method: HookMethod, hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): void;
  getHooks(method: HookMethod): Hook<Path, ReqEvent, unknown, unknown>[] | undefined;
  getMethods(): string[];
  hasMethod(method: string): boolean;
  setSchema(method: HandlerMethod, schema: SchemaDefinition): void;
  getSchema(method: HandlerMethod): SchemaDefinition | undefined;

  /**
   * Sets route-level hooks.
   * @param hooks A comma-separated list of hook functions.
   */
  hook<ReqSchema = unknown>(...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;

  // HTTP methods, with overloads to accomodate schemas
  get<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  get<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  post<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  post<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  put<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  put<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  patch<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  patch<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  delete<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  delete<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  head<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  head<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  optins<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  options<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  fallback<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
  fallback<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): Store<Path, ReqEvent>;
}

export declare class Xi<ReqEvent extends BaseEvent = BaseEvent> {
  constructor()

  find(path: string): StoreResult;
  getConfig(): XiConfig;
  getRoutes(): { pattern: string, methods: string[] }[];
  matcher(name: string, matcher: Matcher): void;
  route<Path extends string>(path: Path): Store<Path, ReqEvent>;
  router(...router: Router<ReqEvent>[]): void;
}
