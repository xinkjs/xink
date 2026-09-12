---
title: Others
---

## 404 and 405 handling

If a requested route does not exist, a 404 is returned.

If a requested route exists but there is no matching or fallback method, a 405 is returned with an `Allow` header indicating the available methods.

## etag handling

If a request header of `if-none-match` exists and matches the response `etag` header, a 304 is returned with the following headers (if they exist on the response):

`cache-control`, `content-location`, `date`, `expires`, `set-cookie`, `vary`

## CSRF Protection

Checks content type and origin ([ref](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#disallowing-simple-content-types)). The request's own origin is trusted by default; use `allowed_origins` to add other exact origins. The deprecated `check_origin: false` setting remains available for backwards compatibility when `allowed_origins` is empty.
