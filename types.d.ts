import type { Store, Params } from "@xinkjs/xin"
import type { SerializeOptions, ParseOptions } from "cookie"
import type { Plugin } from 'vite'

type AtLeastOne<T, P> = { [K in keyof T]: Pick<T, K> }[keyof T]
interface AllowedValidatorTypes {
  form: any;
  json: any;
  query: any;
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
export type RequestEvent = {
  cookies: Cookies;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  locals: { [key: string]: any },
  params: Params;
  request: Request;
  store: Store | null;
  setHeaders: (headers: { [key: string]: any; }) => void;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  valid: {
    form?: { [key: string]: any };
    json?: { [key: string]: any };
    query?: { [key: string]: any };
  }
}
export type ResolveEvent = (event: RequestEvent) => MaybePromise<Response>;
/**
 * TODO require at least one of these and still show options if missing.
 */
export interface Validators {
  GET?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  POST?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  PUT?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  PATCH?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  DELETE?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  HEAD?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  OPTIONS?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
  fallback?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'query'>;
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
  fetch(request: Request): Promise<Response>;
  init(): Promise<void>;
}
