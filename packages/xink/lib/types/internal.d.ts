import type { XinkAdapter } from '../../types'

export type Config = {
  adapter: XinkAdapter;
  check_origin: boolean;
  entrypoint: string;
  middleware_dir: string;
  out_dir: string;
  params_dir: string;
  routes_dir: string;
}
export type Handler = (event: RequestEvent) => MaybePromise<Response>;
