---
title: Types
---

`ServeOptions` are Bun or Deno serve options. We take care of passing these, from `serve_options`, to `adapter` internally.

```ts
type XinkConfig = {
  adapter: (options?: ServeOptions) => XinkAdapter; // null
  check_origin?: boolean; // true
  entrypoint?: string; // index.ts
  out_dir?: string; // build
  serve_options?: ServeOptions; // {}
}

type AtLeastOne<T, P> = { [K in keyof T]: Pick<T, K> }[keyof T]
interface Context {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}
type Cookies = {
  delete(name: string, options?: SerializeOptions): void;
  get(name: string, options?: ParseOptions): string | undefined;
  getAll(options?: ParseOptions): Array<{ name: string, value: string }>;
  set(name: string, value: string, options?: SerializeOptions): void;
}
type Handle = (event: RequestEvent, resolve: ResolveEvent) => MaybePromise<Response>;
type Params = { [key: string]: string };
type Store = { [key: string]: any };

interface AllowedValidatorTypes {
  form?: any;
  json?: any;
  params?: any;
  query?: any;
}
interface RequestEvent<V extends AllowedValidatorTypes = AllowedValidatorTypes> {
  cookies: Cookies;
  ctx: Context;
  env: Env.Bindings;
  headers: Omit<Headers, 'toJSON' | 'count' | 'getAll'>;
  html: (data: any, init?: ResponseInit | undefined): Response;
  json: (data: any, init?: ResponseInit | undefined): Response;
  locals: Api.Locals,
  params: Params;
  redirect: (status: number, location: string): never;
  request: Request;
  store: Store | null;
  setHeaders: (headers: { [key: string]: any; }) => void;
  text: (data: string, init?: ResponseInit | undefined): Response;
  url: Omit<URL, 'createObjectURL' | 'revokeObjectURL' | 'canParse'>;
  valid: V
}

export interface Schemas {
  get?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  post?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  put?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  patch?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  delete?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  head?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  options?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  default?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
}

interface Validators {
  get?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  post?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  put?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  patch?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  delete?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  head?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  options?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
  default?: AtLeastOne<AllowedValidatorTypes, 'form' | 'json' | 'params' | 'query'>;
}
```
