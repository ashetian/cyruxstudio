# Milestone 4 Handoff Report: Challenger 2 (Empirical Review)

**Challenger**: `teamwork_preview_challenger` (Challenger 2)  
**Parent Agent ID**: `6d2c4eb5-38de-4b31-91e2-cf749d8c0ff8`  
**Milestone**: M4 (Secure Minimal Admin Panel & Vercel Blob)  
**Date**: 2026-11-14T18:15:00Z  
**Type**: Hard Handoff (Review Complete - Verdict: REQUEST_CHANGES)

---

## 1. Observation

1. **Vercel Blob URL Deletion Implementation**:
   - `src/lib/blob.ts` lines 85-87:
     ```typescript
     if (parsed.pathname.includes("..")) {
       throw new Error("Path traversal sequence detected in blob URL");
     }
     ```
   - `src/lib/validations.ts` lines 449-455:
     ```typescript
     const u = new URL(val);
     return (
       u.protocol === "https:" &&
       u.hostname.endsWith(".blob.vercel-storage.com") &&
       !u.pathname.includes("..")
     );
     ```
   - `src/app/api/admin/blob/delete/route.ts` lines 32-35:
     ```typescript
     const url = String(rawBody.url).trim();
     validateDeleteUrl(url);
     const result = await deleteBlob(url);
     ```

2. **Empirical Behavior Under Test**:
   - Running test harness `tests/m4-challenger-empirical.ts`:
     Request URL: `https://cyrux-store.public.blob.vercel-storage.com/uploads/../../etc/passwd`
     Output from `npx tsx tests/m4-challenger-empirical.ts`:
     ```
     ✖ [FAIL] 3.3 Malicious delete URL rejected (Path traversal (..)) -> URL: https://cyrux-store.public.blob.vercel-storage.com/uploads/../../etc/passwd, Status: 200, Error: "undefined"
     ✖ [FAIL] 3.3.b blobDeleteSchema rejects malicious URL (Path traversal (..))
     ✖ [FAIL] 3.3.c validateDeleteUrl throws for malicious URL (Path traversal (..))
     ```
   - Testing WHATWG URL behavior directly:
     ```bash
     $ node -e '
     const u = new URL("https://cyrux-store.public.blob.vercel-storage.com/uploads/../../etc/passwd");
     console.log(u.pathname); // Output: "/etc/passwd"
     console.log(u.pathname.includes("..")); // Output: false
     '
     ```
     The URL parser normalizes the path segment before populating `pathname`, stripping `..` and bypassing both `parsed.pathname.includes("..")` and `!u.pathname.includes("..")`.

3. **Product CRUD Boundaries (Verified Clean)**:
   - Invalid slugs (`UPPERCASE`, `spaces in slug`, `special@chars!`, empty slug) all return HTTP 400 with verbatim error:
     `"Slug must be URL-safe lowercase with hyphens"`
   - Zero or negative create price (`0`, `-10`) returns HTTP 400 with verbatim error:
     `"Price must be greater than zero"`
   - Negative update price (`-5`) returns HTTP 400 with verbatim error:
     `"Price must be positive"`
   - Non-existent product deletion returns HTTP 404 with verbatim error:
     `"Product <id> not found"`

4. **Settings Validation (Verified Clean)**:
   - Phones without `+` or with invalid country code (`5551234567`, `invalid`) return HTTP 400 with verbatim error:
     `"whatsappNumber must be a valid E.164 formatted number starting with +"`
   - Invalid currencies (`BTC`, `JPY`, `CAD`, `AUD`) return HTTP 400 with verbatim error:
     `"currency must be one of: USD, EUR, TRY, GBP"`

5. **Blob Storage MIME & Size Limits (Verified Clean)**:
   - Disallowed MIME types (`application/pdf`, `text/html`, `application/x-sh`, `image/gif`) return HTTP 400 with `"Unsupported media type"`.
   - Oversized files (>15MB image, >50MB video) return limit violation errors.
   - Domain spoofing (`blob.vercel-storage.com.attacker.com`) and non-HTTPS URLs are rejected with HTTP 400.

6. **Tool Commands and Results**:
   - `npm test`: Passed (130/130 tests pass).
   - `npm run lint`: Passed (`✔ No ESLint warnings or errors`).
   - `npm run build`: Passed (`✓ Compiled successfully in 4.5s`, 15/15 static/dynamic routes generated).
   - `npx tsx tests/m4-challenger-empirical.ts`: 126/129 passed, 3 failed on path traversal rejection.

---

## 2. Logic Chain

1. Mandatory Task Requirement 3 specifies: *"Deletion URLs with non-Vercel domains, spoofed domains (`blob.vercel-storage.com.attacker.com`), and path traversal (`..`): Verify rejected."*
2. Based on Observation 1, both `validateDeleteUrl` and `blobDeleteSchema` inspect `pathname.includes("..")` after parsing with `new URL(rawUrl)`.
3. Based on Observation 2, WHATWG URL standard rules specify that `new URL()` resolves relative path segments (`..`) during construction. For example, `https://domain.com/uploads/../../etc/passwd` resolves to `https://domain.com/etc/passwd`.
4. Because the `..` sequence is normalized away prior to checking `pathname`, `parsed.pathname.includes("..")` evaluates to `false`.
5. As observed empirically in Observation 2, when `DELETE /api/admin/blob/delete` receives a URL containing `..`, it does not reject the request with HTTP 400; instead, it executes `deleteBlob` and responds with HTTP 200.
6. Therefore, the implementation contains an active security validation bypass against path traversal in deletion URLs.
7. Consequently, Milestone 4 cannot be approved until this vulnerability is remediated by the worker.

---

## 3. Caveats

- All other Milestone 4 requirements (Product CRUD validation and boundaries, StoreSettings E.164 phone and currency whitelist, Edge Middleware route protection, JWT token lifecycle and constant-time comparisons, Blob MIME whitelisting, and Blob file size limits) passed all empirical tests with zero errors.
- Build (`npm run build`), linting (`npm run lint`), and existing test suites (`npm test`) pass completely.
- No caveats regarding reproducibility: the path traversal flaw is 100% reproducible via `npx tsx tests/m4-challenger-empirical.ts`.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

Milestone 4 is largely well-constructed, but must **REQUEST_CHANGES** due to Challenge 1:
- The worker must update `src/lib/blob.ts:validateDeleteUrl` and `src/lib/validations.ts:blobDeleteSchema` to inspect the raw input string (`rawUrl` / `val`) for `..` (and `%2e%2e`), rejecting any URL containing path traversal sequences with HTTP 400.

---

## 5. Verification Method

1. Run the empirical challenger suite:
   ```bash
   npx tsx tests/m4-challenger-empirical.ts
   ```
2. Inspect the failure on:
   - `3.3 Malicious delete URL rejected (Path traversal (..))`
   - `3.3.b blobDeleteSchema rejects malicious URL (Path traversal (..))`
   - `3.3.c validateDeleteUrl throws for malicious URL (Path traversal (..))`
3. After the worker applies the fix:
   ```bash
   npx tsx tests/m4-challenger-empirical.ts
   npm test
   npm run lint
   npm run build
   ```
   All 129 empirical assertions must pass with 100% success rate.
