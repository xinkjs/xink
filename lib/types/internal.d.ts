import type { CookieSerializeOptions } from 'cookie'

export interface Cookie {
  name: string;
  value: string;
  options: CookieSerializeOptions;
}
export type DefaultConfig = {
  params: string;
  routes: string;
}
export type Handler = (event: RequestEvent) => MaybePromise<Response>;
export type Handlers = {
  [key: string]: Handler;
}
export type MaybePromise<T> = T | Promise<T>
export type ValidatedConfig = {
  entrypoint: string;
  middleware_dir: string;
  out_dir: string;
  params_dir: string;
  routes_dir: string;
  runtime: 'bun' | 'deno' | 'node';
}

/* Router */
export type Matcher = ((param: string) => boolean) | null;
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
  [key: string]: Handler;
 }
export type StoreFactory = () => Store
