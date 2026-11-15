# Milestone 4 Empirical Challenge Report

**Challenger**: `teamwork_preview_challenger` (Challenger 2)  
**Parent Agent ID**: `6d2c4eb5-38de-4b31-91e2-cf749d8c0ff8`  
**Milestone**: M4 (Secure Minimal Admin Panel & Vercel Blob)  
**Date**: 2026-11-14T18:14:00Z  
**Verdict**: **REQUEST_CHANGES**

---

## Challenge Summary

**Overall risk assessment**: **HIGH**

While the Product CRUD APIs, StoreSettings schema validation, Edge Middleware, and basic Blob MIME / size limits are robust and pass their boundary tests, an empirical security vulnerability was discovered in the Vercel Blob deletion URL validation (`src/lib/blob.ts:validateDeleteUrl` and `src/lib/validations.ts:blobDeleteSchema`).

Due to WHATWG URL parser path normalization in `new URL(val)`, checking `parsed.pathname.includes("..")` fails to detect path traversal sequences in deletion URLs (e.g. `https://cyrux-store.public.blob.vercel-storage.com/uploads/../../etc/passwd`). The relative directory traversal segments are resolved by the URL constructor before the check runs, resolving to `/etc/passwd`. Consequently, the endpoint does not reject the malicious request, accepting it with HTTP 200 instead of returning HTTP 400.

---

## Challenges

### [High] Challenge 1: Vercel Blob Deletion Path Traversal Bypass via WHATWG URL Normalization

- **Assumption challenged**: The worker assumed that checking `parsed.pathname.includes("..")` or `!u.pathname.includes("..")` after parsing a URL string with `new URL()` would catch path traversal attempts (`..`).
- **Attack scenario**:
  An administrator or compromised token issues a `DELETE` request to `/api/admin/blob/delete` with:
  ```json
  {
    "url": "https://cyrux-store.public.blob.vercel-storage.com/uploads/../../etc/passwd"
  }
  ```
  1. `validateDeleteUrl` executes `parsed = new URL(rawUrl)`.
  2. The WHATWG URL constructor normalizes the path: `/uploads/../../etc/passwd` becomes `/etc/passwd`.
  3. `parsed.pathname.includes("..")` evaluates to `false` because the literal `..` has been resolved away.
  4. `blobDeleteSchema` in `src/lib/validations.ts` performs the identical check `!u.pathname.includes("..")`, which also evaluates to `true` (valid).
  5. The request bypasses validation, executes `deleteBlob(url)`, and returns `HTTP 200 { success: true, deletedUrl: "..." }`.
- **Blast radius**:
  Arbitrary blob keys outside the designated `/uploads/` namespace or root bucket assets can be targeted for deletion. This directly fails mandatory task requirement 3: *"Deletion URLs with non-Vercel domains, spoofed domains (`blob.vercel-storage.com.attacker.com`), and path traversal (`..`): Verify rejected."*
- **Mitigation**:
  Inspect the raw URL string (`rawUrl` / `val`) directly before or in conjunction with URL parsing:
  1. In `src/lib/blob.ts:validateDeleteUrl`:
     ```typescript
     if (rawUrl.includes("..") || parsed.pathname.includes("..")) {
       throw new Error("Path traversal sequence detected in blob URL");
     }
     ```
  2. In `src/lib/validations.ts:blobDeleteSchema`:
     ```typescript
     refine(
       (val) => {
         try {
           if (val.includes("..")) return false;
           const u = new URL(val);
           return (
             u.protocol === "https:" &&
             u.hostname.endsWith(".blob.vercel-storage.com")
           );
         } catch {
           return false;
         }
       },
       {
         message: "Only Vercel Blob URLs (*.blob.vercel-storage.com) without traversal sequences can be deleted",
       }
     )
     ```

---

## Stress Test Results

Executed via automated test harness `tests/m4-challenger-empirical.ts` (129 total assertions):

### Group 1: Product CRUD Boundary Tests
| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| POST `/api/admin/products` with uppercase slug (`UPPERCASE_SLUG`) | HTTP 400 + `"Slug must be URL-safe lowercase with hyphens"` | HTTP 400, exact error message returned | **PASS** |
| POST `/api/admin/products` with space in slug (`spaces in slug`) | HTTP 400 + `"Slug must be URL-safe lowercase with hyphens"` | HTTP 400, exact error message returned | **PASS** |
| POST `/api/admin/products` with special characters (`special@chars!`) | HTTP 400 + `"Slug must be URL-safe lowercase with hyphens"` | HTTP 400, exact error message returned | **PASS** |
| POST `/api/admin/products` with empty slug (`""`) | HTTP 400 + `"Slug must be URL-safe lowercase with hyphens"` | HTTP 400, exact error message returned | **PASS** |
| POST `/api/admin/products` with whitespace-only slug (`"   "`) | HTTP 400 + `"Slug must be URL-safe lowercase with hyphens"` | HTTP 400, exact error message returned | **PASS** |
| POST `/api/admin/products` with dot notation slug (`has.dots`) | HTTP 400 + `"Slug must be URL-safe lowercase with hyphens"` | HTTP 400, exact error message returned | **PASS** |
| POST `/api/admin/products` with zero price (`0`) | HTTP 400 + `"Price must be greater than zero"` | HTTP 400, exact error message returned | **PASS** |
| POST `/api/admin/products` with negative price (`-10`, `-0.01`, `-99999`) | HTTP 400 + `"Price must be greater than zero"` | HTTP 400, exact error message returned | **PASS** |
| POST `/api/admin/products` with duplicate slug | HTTP 409 + `"Product with this slug already exists"` | HTTP 409, collision blocked | **PASS** |
| PUT/PATCH `/api/admin/products/[id]` with negative price (`-5`, `0`, `-100`) | HTTP 400 + `"Price must be positive"` | HTTP 400, exact error message returned | **PASS** |
| DELETE `/api/admin/products/[id]` with non-existent ID (`missing_id`) | HTTP 404 + `"not found"` | HTTP 404, `"Product missing_id not found"` returned | **PASS** |
| Lifecycle: Create valid product -> Update fields -> Delete | HTTP 201 -> HTTP 200 -> HTTP 200 -> Subsequent DELETE returns HTTP 404 | All phases succeeded deterministically | **PASS** |

### Group 2: StoreSettings Validation Tests
| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| PUT `/api/admin/settings` with phone missing `+` (`5551234567`) | HTTP 400 + `"whatsappNumber must be a valid E.164 formatted number starting with +"` | HTTP 400, exact error message returned | **PASS** |
| PUT `/api/admin/settings` with invalid phone (`invalid`) | HTTP 400 + `"whatsappNumber must be a valid E.164 formatted number starting with +"` | HTTP 400, exact error message returned | **PASS** |
| PUT `/api/admin/settings` with US phone missing `+` (`15551234567`) | HTTP 400 + exact error message | HTTP 400, exact error message returned | **PASS** |
| PUT `/api/admin/settings` with short phone (`+12`) | HTTP 400 + exact error message | HTTP 400, exact error message returned | **PASS** |
| PUT `/api/admin/settings` with double plus (`++905321234567`) | HTTP 400 + exact error message | HTTP 400, exact error message returned | **PASS** |
| PUT `/api/admin/settings` with invalid currency (`BTC`) | HTTP 400 + `"currency must be one of: USD, EUR, TRY, GBP"` | HTTP 400, exact error message returned | **PASS** |
| PUT `/api/admin/settings` with invalid currency (`JPY`) | HTTP 400 + `"currency must be one of: USD, EUR, TRY, GBP"` | HTTP 400, exact error message returned | **PASS** |
| PUT `/api/admin/settings` with invalid currency (`CAD`) | HTTP 400 + `"currency must be one of: USD, EUR, TRY, GBP"` | HTTP 400, exact error message returned | **PASS** |
| PUT `/api/admin/settings` with invalid currency (`AUD`, `CHF`, `CNY`, `RUB`) | HTTP 400 + `"currency must be one of: USD, EUR, TRY, GBP"` | HTTP 400, exact error message returned | **PASS** |
| PUT `/api/admin/settings` with valid currencies (`USD`, `EUR`, `TRY`, `GBP`) | HTTP 200, setting updated | HTTP 200 for all 4 supported currencies | **PASS** |

### Group 3: Blob Storage Security Tests
| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| Upload unsupported MIME types (`application/pdf`, `text/html`, `application/x-sh`) | HTTP 400 + `"Unsupported media type"` | HTTP 400, rejected by upload route and lib | **PASS** |
| Upload executable/archive MIME types (`application/javascript`, `application/zip`, `image/gif`) | HTTP 400 + `"Unsupported media type"` | HTTP 400, rejected cleanly | **PASS** |
| Upload oversized image (`16MB JPEG`, `20MB WebP`, `15MB + 1B PNG`) | Rejected with limit violation (>15MB) | Throws limit error / HTTP 413 | **PASS** |
| Upload oversized video (`51MB MP4`, `50MB + 1B QuickTime`) | Rejected with limit violation (>50MB) | Throws limit error / HTTP 413 | **PASS** |
| Upload boundary sizes (Exactly `15MB` image, `50MB` video) | Accepted without throwing | Passes validation | **PASS** |
| Delete non-HTTPS URL (`http://cyrux-store...`) | HTTP 400 + rejected | HTTP 400, non-HTTPS rejected | **PASS** |
| Delete non-Vercel external domain (`https://attacker.com/...`) | HTTP 400 + rejected | HTTP 400, external domain rejected | **PASS** |
| Delete spoofed suffix domain (`https://blob.vercel-storage.com.attacker.com/...`) | HTTP 400 + rejected | HTTP 400, spoofed hostname rejected | **PASS** |
| Delete spoofed host in subdomain (`https://evil-blob.vercel-storage.com.malicious.io/...`) | HTTP 400 + rejected | HTTP 400, spoofed hostname rejected | **PASS** |
| Delete with path traversal (`https://cyrux-store.../uploads/../../etc/passwd`) | **HTTP 400 + rejected** | **HTTP 200 Accepted (Bypassed!)** | **FAIL** |
| Delete with encoded traversal (`https://cyrux-store.../..%2f..%2fsecret`) | HTTP 400 + rejected | HTTP 400, rejected | **PASS** |
| Delete with FTP protocol or javascript URI scheme | HTTP 400 + rejected | HTTP 400, rejected | **PASS** |
| Valid upload -> verify *.blob.vercel-storage.com URL -> delete | HTTP 201 -> HTTP 200 | Uploaded and deleted successfully | **PASS** |
| Unauthenticated DELETE `/api/admin/blob/delete` | HTTP 401 Unauthorized | HTTP 401 Unauthorized returned | **PASS** |

### Group 4: Edge Middleware Route Protection
| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| Unauthenticated GET `/api/admin/products` | HTTP 401 Unauthorized | Intercepted with HTTP 401 | **PASS** |
| Unauthenticated PUT `/api/admin/settings` | HTTP 401 Unauthorized | Intercepted with HTTP 401 | **PASS** |
| Unauthenticated browser visit `/admin` | HTTP 307 redirect to `/admin/login` | Redirected with HTTP 307 to `/admin/login` | **PASS** |
| Valid JWT session on `/api/admin/products` | Passes middleware to handler | Returns HTTP 200 | **PASS** |

---

## Build, Lint & Master Test Suite Verification

1. `npx prisma generate` -> Success (Exit code 0)
2. `npx tsc --noEmit` -> Success (0 errors, exit code 0)
3. `npm run lint` -> Success (`✔ No ESLint warnings or errors`, exit code 0)
4. `npm run build` -> Success (`✓ Compiled successfully in 4.5s`, 15/15 static/dynamic routes generated, exit code 0)
5. `npm test` -> Success (130/130 existing tests pass, exit code 0)
6. `npx tsx tests/m4-challenger-empirical.ts` -> **126/129 passed, 3 failed on path traversal rejection** (Exit code 1)

---

## Unchallenged Areas

- Hardware security keys (WebAuthn / FIDO2): Not in project specification. JWT HttpOnly cookie authentication is mandated by R4.
- Direct Neon Postgres live connection: Mock provider handles database operations in the test environment as designed for deterministic CI/CD execution without external database dependency.

---

## Conclusion & Verdict

**Verdict**: **REQUEST_CHANGES**

The worker must address Challenge 1 by modifying `src/lib/blob.ts:validateDeleteUrl` and `src/lib/validations.ts:blobDeleteSchema` to check the raw URL string for path traversal (`..` or `%2e%2e`) before or in addition to `new URL()` normalization, ensuring any traversal attempt is strictly rejected with HTTP 400.
