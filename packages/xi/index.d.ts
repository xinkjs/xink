import type {
  BaseStore,
  Matcher,
  MatcherResult,
  MixedResult,
  ParsedSegment as InternalParsedSegment,
  StoreConstructor as InternalStoreConstructor,
  XiConfig as InternalXiConfig
} from './internal-types'

export { BaseStore }

export type XiConfig = InternalXiConfig

export type ParsedSegment = InternalParsedSegment

export type StoreConstructor<T extends BaseStore> = InternalStoreConstructor<T>

export declare class Node<TStore> {
  static_children: Map<string, Node<TStore>>;
  dynamic_child: Node<TStore> | null;
  param_name: string | null;
  mixed_children: Map<string, Node<TStore>>;
  matcher_children: Map<string, Node<TStore>>;
  wildcard_child: Node<TStore> | null;
  store: TStore | null;
  pattern: string | null;
}

export declare abstract class Xi<TStore> {
  protected abstract getStoreConstructor(): StoreConstructor<TStore>
  constructor(options: Partial<XiConfig>)
  root: Node

  find(path: string): { store: TStore | null, params: Record<string, string | undefined> };
  getConfig(): XiConfig;
  getRoutes(): { pattern: string, methods: string[] }[];
  matcher(name: string, matcher: Matcher): void;
  route(path: string): TStore<Path>;
}
