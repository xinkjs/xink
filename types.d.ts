export type Middleware = () => Promise<any> | any | void;
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
