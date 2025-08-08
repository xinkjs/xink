import type { Router as URLRouter, Handler, Hook, Store } from "@xinkjs/xi"
import type { SerializeOptions, ParseOptions } from 'cookie'

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

export interface RequestEvent extends BaseEvent {
  request: Request;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  platform: Record<string, any>;
  params: Record<string, string | undefined>;
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
  use(...middleware: Handle[]): void;
  getMiddleware(): Handle[];
  onError(handler: ErrorHandler): void;
  onNotFound(handler: NotFoundHandler): void;
};

export { Handler, Hook, Store };