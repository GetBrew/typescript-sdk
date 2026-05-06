# Changelog

## 1.1.0

### Breaking shape narrowing

- `GenerateEmailInput` no longer accepts `brandId`. The brand is resolved
  from the API key on the server. Sending `brandId` returns
  `400 INVALID_REQUEST`.
- `ListEmailsInput` no longer accepts `brandId`. Same rationale.

These shapes were generated from `openapi/public-api-v1.yaml`, so the
change is type-level. Existing call sites that pass `brandId` will fail
TypeScript compilation; remove the field. Runtime behavior was already
inconsistent: the server returned `403 BRAND_SCOPE_MISMATCH` if the
value did not match the key brand and silently used the key brand
otherwise.

### Improvements

- `brew.emails.generate` now defaults `RequestOptions.timeoutMs` to
  **4 minutes** for `POST /v1/emails`. The global SDK default is 30
  seconds, which used to abort legitimate 30–90 second email
  generations. Caller-supplied `timeoutMs` and `signal` still win.
- Exposed `GENERATE_EMAIL_DEFAULT_TIMEOUT_MS` from the public entrypoint
  for callers who want to compose their own timeouts.

### Docs

- `docs/emails.md` documents the new shape, the long-running nature of
  `POST /v1/emails`, and how to handle the `GenerateEmailResponse`
  union.

## 1.0.0

Initial release.
