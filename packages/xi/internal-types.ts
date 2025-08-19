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

export type XiConfig = {
  base_path: string;
}

/** The minimal constraint for a custom context object. */
export type BaseEvent = object;

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

/** Utility type representing a value that may or may not be a Promise. */
export type MaybePromise<T> = T | Promise<T>;
export type BasicRouteInfo<ReqEvent extends BaseEvent> = { pattern: string; methods: string[], store: IStore<string, ReqEvent> }[]
export type Handler<
  Path extends string = string, 
  ReqEvent extends BaseEvent = BaseEvent,
  ReqSchema = unknown,
  ResSchema = unknown,
> = (event: RequestContext<Path, ReqEvent, ReqSchema, ResSchema>) => MaybePromise<Response | any>;
export type Hook<
  Path extends string = string, 
  ReqEvent extends BaseEvent = BaseEvent,
  ReqSchema = unknown,
  ResSchema = unknown
> = (event: RequestContext<Path, ReqEvent, ReqSchema, ResSchema>, next?: () => MaybePromise<void>) => MaybePromise<void>;
export type HandlerMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'FALLBACK';
export type HookMethod = HandlerMethod | 'ALL';
export type Matcher = (param: string) => boolean;
export type SchemaDefinition = Record<string, any> | (() => MaybePromise<unknown>);

export interface INode<ReqEvent extends BaseEvent> {
  static_children: Map<string, INode<ReqEvent>>;
  dynamic_child: INode<ReqEvent> | null;
  param_name: string | null;
  mixed_children: Map<string, INode<ReqEvent>>;
  matcher_children: Map<string, INode<ReqEvent>>;
  wildcard_child: INode<ReqEvent> | null;
  store: IStore<string, ReqEvent> | null;
  pattern: string | null;
}

export interface IStore<Path extends string = string, ReqEvent extends BaseEvent = BaseEvent> {
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
  hook<ReqSchema = unknown>(...hooks: Hook<Path, ReqEvent, ReqSchema>[]): IStore<Path, ReqEvent>;

  get<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  get<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  post<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  post<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  put<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  put<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  patch<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  patch<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  delete<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  delete<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  head<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  head<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  options<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  options<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  fallback<ReqSchema = unknown, ResSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
  fallback<ReqSchema = unknown, ResSchema = unknown>(handler: Handler<Path, ReqEvent, ReqSchema, ResSchema>, ...hooks: Hook<Path, ReqEvent, ReqSchema, ResSchema>[]): IStore<Path, ReqEvent>;
}

export interface IRouter<ReqEvent extends BaseEvent = BaseEvent> {
  find(path: string): StoreResult<ReqEvent>;
  getConfig(): XiConfig;
  getRoutes(): { pattern: string, methods: string[] }[];
  matcher(name: string, matcher: Matcher): void;
  route<Path extends string>(path: Path): IStore<Path, ReqEvent>;
  router(router: IRouter<ReqEvent>): void;
}

interface StaticSegment {
  type: "static";
}

interface WildcardSegment {
  type: "wildcard";
  param_name: string;
}

interface MatcherSegment {
  type: "matcher";
  param_name: string;
  matcher_name: string;
  pattern: string;
}

interface DynamicSegment {
  type: "dynamic";
  param_name: string;
}

interface MixedSegment {
  type: "mixed";
  static_part: string;
  param_name: string;
  pattern: string;
}

export type ParsedSegment =
  | StaticSegment
  | WildcardSegment
  | MatcherSegment
  | DynamicSegment
  | MixedSegment;

interface MatcherSuccess {
  matches: true;
  param_value: string;
  matcher_name: string;
}

interface MatcherFailure {
  matches: false;
}

export type MatcherResult = MatcherSuccess | MatcherFailure;

interface MixedSuccess {
  matches: true;
  param_value: string;
}

interface MixedFailure {
  matches: false;
}

export type MixedResult = MixedSuccess | MixedFailure;

export type StoreResult<ReqEvent extends BaseEvent> = { store: IStore<string, ReqEvent> | null; params: Record<string, string | undefined> }
