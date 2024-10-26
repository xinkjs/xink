import type { CookieSerializeOptions } from 'cookie'

export type DefaultConfig = {
  middleware_dir: string;
  out_dir: string;
  params_dir: string;
  routes_dir: string;
}
export type Handler = (event: RequestEvent) => MaybePromise<Response>;
export type ValidatedConfig = {
  entrypoint: string;
  middleware_dir: string;
  out_dir: string;
  params_dir: string;
  routes_dir: string;
  runtime: 'bun' | 'cloudflare' | 'deno';
}
