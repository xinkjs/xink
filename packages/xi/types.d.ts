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
type ParsePath<Path extends string> = {
  [Segment in PathSegments<Path>[number] as ParamNameFromSegment<Segment>]: string
};

/** The minimal constraint for a custom context object. */
export type BaseEvent = object;

/**
 * The final, fully-formed context object passed to handlers and hooks.
 * It's an intersection of the user-provided context (`TEvent`)
 * and the dynamically parsed route parameters.
 */
type RequestContext<
  Path extends string,
  TEvent extends BaseEvent
> = Omit<TEvent, 'params'> & { // remove possible params key defined from higher-level router
  params: ParsePath<Path>;
};

/** Utility type representing a value that may or may not be a Promise. */
export type MaybePromise<T> = T | Promise<T>;
export type BasicRouteInfo = { pattern: string; methods: string[] }[]
export type Handler<
  Path extends string = string, 
  TEvent extends BaseEvent = BaseEvent
> = (event: RequestContext<Path, TEvent>) => MaybePromise<Response | any>;
export type Hook<
  Path extends string = string, 
  TEvent extends BaseEvent = BaseEvent
> = (event: RequestContext<Path, TEvent> | any, next: () => Promise<void>) => MaybePromise<void | any>;
export type HandlerMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'FALLBACK';
export type HookMethod = HandlerMethod | 'ALL';
export type Matcher = (param: string) => boolean;

export declare class Store<Path extends string = string, TEvent extends BaseEvent = BaseEvent> {
  handlers: Map<HandlerMethod, Handler<Path, TEvent>>;
  hooks: Map<HookMethod, Hook<Path, TEvent>[]>;

  getHandler(method: string): Handler<Path, TEvent> | undefined;
  setHandler(method: string, handler: Handler<Path, TEvent>): void;
  getHooks(method: HookMethod): Hook<Path, TEvent>[] | undefined;
  setHooks(method: string, hooks: Hook<Path, TEvent>[]): void;
  getMethods(): string[];
  hasMethod(method: string): boolean;

  /**
   * Sets route-level hooks.
   * @param hooks A comma-separated list of hook functions.
   */
  hook(...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent>;

  get(handler: Handler<Path, TEvent>, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent>;
  post(handler: Handler<Path, TEvent>, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent>;
  put(handler: Handler<Path, TEvent>, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent>;
  patch(handler: Handler<Path, TEvent>, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent>;
  delete(handler: Handler<Path, TEvent>, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent>;
  head(handler: Handler<Path, TEvent>, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent>;
  options(handler: Handler<Path, TEvent>, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent>;
  fallback(handler: Handler<Path, TEvent>, ...hooks: Hook<Path, TEvent>[]): Store<Path, TEvent>;
}

type Node = {
  static_children: Map<string, Node>;
  dynamic_child: Node | null;
  param_name: string | null;
  mixed_children: Map<string, Node>;
  matcher_children: Map<string, Node>;
  wildcard_child: Node | null;
  store: Store | null;
  pattern: string | null;
}

export declare class Router<TEvent extends BaseEvent = BaseEvent> {
  root: Node;
  matchers: Map<string, Matcher>;

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

export type StoreResult = { store: Store | null; params: Record<string, string | undefined> }
