export type Handler = (event?: any) => MaybePromise<Response>;
export type MaybePromise<T> = T | Promise<T>
export type Middleware = (handle?: any) => MaybePromise<Response> | void;
export type Matcher = (param: string) => boolean | null;
export type MatcherFn = (param: string) => boolean;
export type MatcherType = string | null;
export type Node = {
  segment: string;
  store: Store | null;
  static_children: Map<number, Node> | null;
  parametric_children: Map<string, ParametricNode> | null;
  wildcard_store: Store | null;
}
export type ParametricNode = {
  matcher: Matcher;
  matcher_type: MatcherType;
  param_name: string;
  store: Store | null;
  static_child: Node | null;
}
export type Params = { [key: string]: string; }
export type Route = { store: Store; params: Params; } | null;
export type Store = { 
  [key: string]: Handler | any;
 }
export type StoreFactory = () => Store;

export class Router {
  constructor(options: { storeFactory?: StoreFactory })

  getTree(): Node;
  setMatcher(type: string, matcher: Matcher): void;
  getMatcher(type: string): Matcher;
  setMiddleware(handle: Middleware): void;
  getMiddlware(): Middleware;
  register(path: string): Store;
  find(path: string): Route;
  get(path: string, handler: Handler): void;
  post(path: string, handler: Handler): void;
  put(path: string, handler: Handler): void;
  patch(path: string, handler: Handler): void;
  delete(path: string, handler: Handler): void;
  head(path: string, handler: Handler): void;
  options(path: string, handler: Handler): void;
  fallback(path: string, handler: Handler): void;
}
