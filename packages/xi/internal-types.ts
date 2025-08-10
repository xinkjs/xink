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

/**
 * The final, fully-formed context object passed to handlers and hooks.
 * It's an intersection of the user-provided context (`TEvent`)
 * and the dynamically parsed route parameters.
 */
export type RequestContext<
  Path extends string,
  TEvent extends BaseEvent,
  TSchema
> = Omit<TEvent, 'params' | 'valid'> & { // remove possible params and valid keys defined from higher-level router
  params: ParsePath<Path>;
  valid: TSchema;
};

/** Utility type representing a value that may or may not be a Promise. */
export type MaybePromise<T> = T | Promise<T>;
export type BasicRouteInfo = { pattern: string; methods: string[] }[]
export type Handler<
  Path extends string = string, 
  TEvent extends BaseEvent = BaseEvent,
  TSchema = unknown
> = (event: RequestContext<Path, TEvent, TSchema>) => MaybePromise<Response | any>;
export type Hook<
  Path extends string = string, 
  TEvent extends BaseEvent = BaseEvent,
  TSchema = unknown
> = (event: RequestContext<Path, TEvent, TSchema>, next?: () => Promise<void>) => MaybePromise<void | any>;
export type HandlerMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'FALLBACK';
export type HookMethod = HandlerMethod | 'ALL';
export type Matcher = (param: string) => boolean;
export type SchemaDefinition = {
  form?: any;
  json?: any;
  params?: any;
  query?: any;
}

export interface INode {
  static_children: Map<string, INode>;
  dynamic_child: INode | null;
  param_name: string | null;
  mixed_children: Map<string, INode>;
  matcher_children: Map<string, INode>;
  wildcard_child: INode | null;
  store: IStore | null;
  pattern: string | null;
}

export interface IStore<Path extends string = string, TEvent extends BaseEvent = BaseEvent> {
  getHandler(method: string): Handler<Path, TEvent, unknown> | undefined;
  getHooks(method: HookMethod): Hook<Path, TEvent, unknown>[] | undefined;
  getMethods(): string[];
  hasMethod(method: string): boolean;
  getSchemas(method: HandlerMethod): SchemaDefinition | undefined;

  /**
   * Sets route-level hooks.
   * @param hooks A comma-separated list of hook functions.
   */
  hook<TSchema = unknown>(...hooks: Hook<Path, TEvent, TSchema>[]): IStore<Path, TEvent>;

  get<TSchema = unknown>(schema: SchemaDefinition, handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): IStore<Path, TEvent>;
  get<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): IStore<Path, TEvent>;
  post<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): IStore<Path, TEvent>;
  put<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): IStore<Path, TEvent>;
  patch<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): IStore<Path, TEvent>;
  delete<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): IStore<Path, TEvent>;
  head<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): IStore<Path, TEvent>;
  options<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): IStore<Path, TEvent>;
  fallback<TSchema = unknown>(handler: Handler<Path, TEvent, TSchema>, ...hooks: Hook<Path, TEvent, TSchema>[]): IStore<Path, TEvent>;
}

export interface IRouter<TEvent extends BaseEvent = BaseEvent> {
  basepath(path: string): void;
  getRoutes(): { pattern: string, methods: string[] }[];
  matcher(name: string, matcher: Matcher): void;
  matchMatcherSegment(pattern: string, segment: string): MatcherResult;
  matchMixedSegment(pattern: string, segment: string): MixedResult;
  matchRoute(node: INode, segments: string[], index: number, params: Record<string, string | undefined>): StoreResult;
  parseSegment(segment: string): ParsedSegment;
  route<Path extends string>(path: Path): IStore<Path, TEvent>;
  find(path: string): StoreResult;
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

export type StoreResult = { store: IStore | null; params: Record<string, string | undefined> }
