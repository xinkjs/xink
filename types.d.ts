import type { Store, Params } from "@xinkjs/xin"
import type { SerializeOptions, ParseOptions } from "cookie"
import type { Plugin } from 'vite'

type AtLeastOne<T, P> = { [K in keyof T]: Pick<T, K> }[keyof T]
interface AllowedValidatorTypes {
  form?: any;
  json?: any;
  params?: any;
  query?: any;
}
export interface Context {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}
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
export type Handle = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>;
export type MaybePromise<T> = T | Promise<T>;
export interface RequestEvent<V extends AllowedValidatorTypes = AllowedValidatorTypes> {
  cookies: Cookies;
  ctx: Context;
  env: Env.Bindings;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  html: typeof html;
  json: typeof json;
  locals: Api.Locals;
  params: Params;
  redirect: typeof redirect;
  request: Request;
  store: Store | null;
  setHeaders: (headers: { [key: string]: any; }) => void;
  text: typeof text;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  valid: V;
}
export type ResolveEvent = (event: RequestEvent) => MaybePromise<Response>;

export interface Validators {
  GET?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  POST?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  PUT?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  PATCH?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  DELETE?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  HEAD?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  OPTIONS?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  fallback?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
}
export type XinkConfig = {
  runtime: 'bun' | 'cloudflare' | 'deno';
  check_origin?: boolean;
  entrypoint?: string; 
  out_dir?: string;
  serve_options?: { [key: string]: any; };
}

export function xink(xink_config?: XinkConfig): Promise<Plugin>;
export function html(data: any, init?: ResponseInit | undefined): Response;
export function json(data: any, init?: ResponseInit | undefined): Response;
export function redirect(status: number, location: string): never;
export function text(data: string, init?: ResponseInit | undefined): Response;
export function sequence(...handlers: Handle[]): Handle;
export class Xink {
  constructor()
  fetch(request: Request, env?: Env.Bindings, ctx?: Context): Promise<Response>;
  init(): Promise<void>;
}
