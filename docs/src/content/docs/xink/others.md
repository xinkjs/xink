---
title: Others
---

## 404 and 405 handling

If a requested route does not exist, a 404 is returned.

If a requested route exists but there is no matching or default method, a 405 is returned with an `Allow` header indicating the available methods.

## etag handling

If a request header of `if-none-match` exists and matches the response `etag` header, a 304 is returned with the following headers (if they exist on the response):

`cache-control`, `content-location`, `date`, `expires`, `set-cookie`, `vary`

## CSRF Protection

Checks content type and origin ([ref](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#disallowing-simple-content-types)). If you don't want this, set `check_origin` to `false` in the xink plugin configuration.
