---
title: API Client
---

xin doesn't have a typed API client, but you can use our OpenAPI integration to create one with a generator like [Hey API](https://heyapi.dev/openapi-ts/get-started).

1. Setup your OpenAPI definitions and path.
2. Generate a client using the schema xin provides at `/<openapi-path>/schema`.

For example, if you're using Hey API, you can run the command below to create your client.

> We're assuming `/reference` as your OpenAPI path; and you'll need to install `@hey-api/client-fetch` in your app before you can make API requests.

```bash
npx @hey-api/openapi-ts \
  -i https://example.com/reference/schema \
  -o src/client \
  -c @hey-api/client-fetch
```
