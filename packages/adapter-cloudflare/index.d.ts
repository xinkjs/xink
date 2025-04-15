import type { XinkAdapter, XinkAdaptContext } from '@xinkjs/xink'
import type { Env, ExecutionContext } from '@cloudflare/workers-types'

export interface PlatformContext {
  env: Env;
  ctx: ExecutionContext;
}

export interface XinkCloudflareAdapterOptions {
  workerEntry?: string;
  // Add options for wrangler.toml generation later if desired
}

/**
 * Creates the Xink adapter configuration for Cloudflare Workers.
 * @param options Configuration options for the Cloudflare adapter.
 * @returns The Xink adapter object for Vite.
 */
export default function adapter(
  options?: XinkCloudflareAdapterOptions,
): XinkAdapter;
