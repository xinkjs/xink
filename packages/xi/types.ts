export class BaseStore {}
export type StoreConstructor<T extends BaseStore> = new () => T;
export type XiConfig = {
  base_path: string;
}

/** Utility type representing a value that may or may not be a Promise. */
export type MaybePromise<T> = T | Promise<T>;

export type Matcher = (param: string) => boolean;

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
