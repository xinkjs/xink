import type { XinkAdapter, XinkAdaptContext } from '@xinkjs/xink'

export interface ServeOptions {
  /** The port to listen on. @default 8000 */
  port?: number;
  /** A literal IP address or host name that can be resolved to an IP address.
   * @default "0.0.0.0" */
  hostname?: string;
  /** An {@linkcode AbortSignal} to close the server. */
  signal?: AbortSignal;
  /** A callback that is called when the server starts listening. */
  onListen?: (params: { port: number; hostname: string }) => void;
  /** A callback that is called when an error occurs handling a request. */
  onError?: (error: unknown) => Response | Promise<Response>;
  /** If the server should reuse the port.
   * @default false */
  reusePort?: boolean;
}

declare module '@xinkjs/xink' {
  interface DenoServeOptions extends ServeOptions {};
}

export default function adapter(options?: ServeOptions): XinkAdapter;
