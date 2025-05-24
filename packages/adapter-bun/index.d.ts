import type { XinkAdapter } from '@xinkjs/xink'

export interface ServeOptions {
  error?: (this: Server, error: unknown) => Response | Promise<Response> | void | Promise<void>;
  /**
   * What port should the server listen on?
   * @default process.env.PORT || "3000"
   */
  port?: string | number;
  /**
   * Whether the `SO_REUSEPORT` flag should be set.
   *
   * This allows multiple processes to bind to the same port, which is useful for load balancing.
   *
   * @default false
   */
  reusePort?: boolean;
  /**
   * Whether the `IPV6_V6ONLY` flag should be set.
   * @default false
   */
  ipv6Only?: boolean;
  /**
   * What hostname should the server listen on?
   * 
   * @default
   * ```js
   * "0.0.0.0" // listen on all interfaces
   * ```
   */
  hostname?: string;
  /**
   * If set, the HTTP server will listen on a unix socket instead of a port.
   * (Cannot be used with hostname+port)
   */
  unix?: never;
  /**
   * Sets the the number of seconds to wait before timing out a connection
   * due to inactivity.
   *
   * Default is `10` seconds.
   */
  idleTimeout?: number;
}

declare module '@xinkjs/xink' {
  interface BunServeOptions extends ServeOptions {};
}

export default function adapter(options?: ServeOptions): XinkAdapter;
