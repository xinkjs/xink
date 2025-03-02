export type DefaultConfig = {
  check_origin: boolean;
  middleware_dir: string;
  out_dir: string;
  params_dir: string;
  routes_dir: string;
}
export type Handler = (event: RequestEvent) => MaybePromise<Response>;
export type ValidatedConfig = DefaultConfig & {
  entrypoint: string;
  runtime: 'bun' | 'cloudflare' | 'deno';
}
