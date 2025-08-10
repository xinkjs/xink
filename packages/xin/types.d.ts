import type { Router as URLRouter, Handler, Hook, SchemaDefinition, Store } from "@xinkjs/xi"
import type { SerializeOptions, ParseOptions } from 'cookie'
import type { ApiReferenceConfiguration } from '@scalar/types'

export type Cookie = {
  name: string;
  value: string;
  options: SerializeOptions;
}
export type Cookies = {
  delete(name: string, options?: SerializeOptions): void;
  get(name: string, options?: ParseOptions): string | undefined;
  getAll(options?: ParseOptions): Array<{ name: string, value: string }>;
  set(name: string, value: string, options?: SerializeOptions): void;
}

/** The minimal constraint for a custom context object. */
export type BaseEvent = object;

export interface RequestEvent<TResponse = any> extends BaseEvent {
  cookies: Cookies;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  html: typeof html;
  json: <T extends TResponse>(data: T, init?: ResponseInit) => Response;
  locals: Api.Locals;
  params: Record<string, string | undefined>;
  platform: Record<string, any>;
  redirect: typeof redirect;
  request: Request;
  setHeaders: (headers: Record<string, any>) => void;
  store: Store | null;
  text: typeof text;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
}

export type ErrorHandler = (error: unknown, event?: RequestEvent) => MaybePromise<Response | void>;
export type NotFoundHandler = (event?: RequestEvent) => MaybePromise<Response | void>;
export type Handle = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>;
export type MaybePromise<T> = T | Promise<T>;
export type ResolveEvent = (event: RequestEvent) => MaybePromise<Response>;
export type Route = { store: Store; params: Record<string, string | undefined>; } | null;
export type PlatformContext = Record<string, any>;
export interface CloudflarePlatformContext {
  env?: Record<string, any>;
  ctx?: {
    waitUntil?: (promise: Promise<any>) => void;
    passThroughOnException?: () => void;
  };
};

export declare class Router extends URLRouter<RequestEvent> {
  fetch(request: Request, platform?: PlatformContext);
  getMiddleware(): Handle[];
  onError(handler: ErrorHandler): void;
  onNotFound(handler: NotFoundHandler): void;
  openapi(metadata: { 
    path: string; 
    data?: {
      openapi?: string;
      info?: {
        title?: string;
        version?: string;
      }
    },
    scalar?: Partial<ApiReferenceConfiguration>
  }): void;
  route<Path extends string>(path: Path, openapi?: Record<string, any>): Store<Path, RequestEvent>;
  use(...middleware: Handle[]): void;
};

export function html(data: any, init?: ResponseInit | undefined): Response;
export function json(data: any, init?: ResponseInit | undefined): Response;
export function redirect(status: number, location: string): never;
export function text(data: string, init?: ResponseInit | undefined): Response;

export { Handler, Hook, SchemaDefinition, Store, ApiReferenceConfiguration };