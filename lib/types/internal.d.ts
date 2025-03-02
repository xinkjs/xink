import type { Router } from "@xinkjs/xin"

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
export class Xink extends Router {
  constructor()
  fetch(request: Request, env?: Env.Bindings, ctx?: Context): Promise<Response>;
  init(): Promise<void>;
  openapi(metadata: { 
    path: string; 
    data?: {
      "openapi": string;
      "info": {
        "title": string;
        "version": string;
      }
    }
  }): void;
  getBasePath(): string;
  setErrorHandler(handler: ErrorHandler): void;
  setMiddleware(handle: Middleware): void;
  setOpenApiPath(path: string, handler: any): void;
}
