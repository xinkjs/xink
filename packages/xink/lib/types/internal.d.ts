import type { XinkAdapter, XinkConfig as PublicXinkConfig } from '../../types'
import type { ServeOptions as BunServeOptions } from '@xinkjs/adapter-bun'
import type { ServeOptions as DenoServeOptions } from '@xinkjs/adapter-deno'

// Helper type to expand/flatten a type alias into its concrete structure
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type BaseConfigFromPublic = PublicXinkConfig<
  (
    options?: BunServeOptions | DenoServeOptions
  ) => XinkAdapter
>;

export type Config = Expand<
  BaseConfigFromPublic &
  Required<Pick<BaseConfigFromPublic, 'check_origin' | 'entrypoint' | 'out_dir'>> &
  {
    middleware_dir: string;
    params_dir: string;
    routes_dir: string;
  }
>;

export type Handler = (event: RequestEvent) => MaybePromise<Response>;
