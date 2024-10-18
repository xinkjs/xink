import type { Router } from "@xinkjs/xin"
import type { Params, Route } from "./lib/types/internal.js"
import type { CookieSerializeOptions } from "cookie"
import type { Plugin } from 'vite'

export type Cookies = {
  delete(name: string, options?: CookieSerializeOptions): void;
  get(name: string, options?: CookieParseOptions): string | undefined;
  getAll(options?: CookieParseOptions): Array<{ name: string, value: string }>;
  set(name: string, value: string, options?: CookieSerializeOptions): void;
}
export type Handle = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>
export type MaybePromise<T> = T | Promise<T>
export type RequestEvent = {
  cookies: Cookies;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  locals: { [key: string]: string },
  params: Params;
  request: Request;
  route: Route;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
}
export type ResolveEvent = (event: RequestEvent) => MaybePromise<Response>
export type XinkConfig = {
  runtime: 'bun' | 'deno' | 'node';
  csrf?: { check?: boolean; origins?: string[]; };
  entrypoint?: string; 
  middleware_dir?: string;
  out_dir?: string;
  params_dir?: string;
  routes_dir?: string;
}

export function xink(xink_config?: XinkConfig): Promise<Plugin>
export function html(data: any, init?: ResponseInit | undefined): Response
export function json(data: any, init?: ResponseInit | undefined): Response
export function redirect(status: number, location: string): never
export function text(data: string, init?: ResponseInit | undefined): Response
export function sequence(...handlers: Handle[]): Handle
export class Xink {
  constructor() {}
  async fetch(request: Request): Promise<Response>
  async init()
}
