---
title: Production
---

## Build

To build the api, run the relevant command per runtime:

- `bun run build`
- `deno task build`
- `npm run build`

## Preview

To preview the api with vite:

- `bun run preview`
- `deno task preview`
- `npm run preview`

To preview the api in your runtime's environment:

- `bun run start`
- `deno task start`
- `wrangler dev`

## Deploy

For Cloudflare, you can deploy your api with `wrangler deploy`.

Cloudflare manages HTTPS for Workers. For Bun and Deno, prefer terminating HTTPS at a managed load balancer, ingress, Caddy, or nginx and keeping the application listener private. Set `public_origin` on the `Xink` instance so origin checks and secure cookies use the external HTTPS URL.

For example, Caddy obtains and renews the certificate while proxying to a private application listener:

```caddyfile
api.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

```ts
const api = new Xink({ public_origin: 'https://api.example.com' })
```

If a reverse proxy is not available, the Bun and Deno adapters can load certificate and key files directly. Xink does not issue or renew certificates.
