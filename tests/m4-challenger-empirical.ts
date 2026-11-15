/**
 * Milestone 4: Adversarial Empirical Challenger Suite
 *
 * Exhaustively stress-tests:
 * 1. Product CRUD boundary tests:
 *    - Create with invalid slugs (UPPERCASE, spaces in slug, special@chars!, empty slug) -> Rejection with "Slug must be URL-safe lowercase with hyphens"
 *    - Create with zero or negative price (0, -10) -> Rejection with "Price must be greater than zero"
 *    - Update with negative price (-5) -> Rejection with "Price must be positive"
 *    - Delete non-existent product ID -> 404 with "not found"
 * 2. Settings validation tests:
 *    - Phone without + or with invalid country code (5551234567, invalid) -> Rejection with "whatsappNumber must be a valid E.164 formatted number starting with +"
 *    - Invalid currency (BTC, JPY, CAD) -> Rejection with "currency must be one of: USD, EUR, TRY, GBP"
 * 3. Blob storage security tests:
 *    - Unsupported MIME types (application/pdf, text/html, application/x-sh) -> Rejected
 *    - Oversized files (>15MB image, >50MB video) -> Rejected
 *    - Deletion URLs with non-Vercel domains, spoofed domains (blob.vercel-storage.com.attacker.com), path traversal (..) -> Rejected
 * 4. Auth & Edge Middleware security checks on Admin API routes
 */

import { NextRequest } from 'next/server';
import { POST as createProductHandler, GET as getProductsHandler } from '../src/app/api/admin/products/route';
import {
  GET as getProductByIdHandler,
  PUT as updateProductHandler,
  PATCH as patchProductHandler,
  DELETE as deleteProductHandler,
} from '../src/app/api/admin/products/[id]/route';
import {
  GET as getSettingsHandler,
  PUT as putSettingsHandler,
  POST as postSettingsHandler,
} from '../src/app/api/admin/settings/route';
import { POST as blobUploadHandler } from '../src/app/api/admin/blob/upload/route';
import {
  DELETE as blobDeleteHandler,
  POST as blobDeletePostHandler,
} from '../src/app/api/admin/blob/delete/route';
import {
  validateUploadFile,
  validateDeleteUrl,
  uploadBlob,
  deleteBlob,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  ALLOWED_BLOB_MIME_TYPES,
} from '../src/lib/blob';
import {
  adminProductCreateSchema,
  adminProductUpdateSchema,
  adminSettingsUpdateSchema,
  blobDeleteSchema,
} from '../src/lib/validations';
import { createAdminSessionToken, SESSION_COOKIE_NAME } from '../src/lib/auth';
import { middleware } from '../src/middleware';
import prisma from '../src/lib/db';

let totalPassed = 0;
let totalFailed = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${testName}`);
    totalPassed++;
  } else {
    const msg = `  ✖ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`;
    console.error(msg);
    failureDetails.push(msg);
    totalFailed++;
  }
}

async function getAuthHeader() {
  const token = await createAdminSessionToken({ email: 'admin@cyrux.studio' });
  return {
    Cookie: `${SESSION_COOKIE_NAME}=${token}`,
    Authorization: `Bearer ${token}`,
  };
}

export async function runEmpiricalM4Suite() {
  console.log('================================================================');
  console.log('   CHALLENGER 2: EMPIRICAL HARNESS FOR MILESTONE 4 (ADMIN & BLOB)');
  console.log('================================================================\n');

  const authHeaders = await getAuthHeader();

  // ============================================================================
  // GROUP 1: PRODUCT CRUD BOUNDARY & VALIDATION TESTS
  // ============================================================================
  console.log('--- Group 1: Product CRUD Boundary & Validation Tests ---');

  // 1.1 Create with invalid slugs
  const invalidSlugs = [
    { slug: 'UPPERCASE_SLUG', desc: 'UPPERCASE slug' },
    { slug: 'spaces in slug', desc: 'spaces in slug' },
    { slug: 'special@chars!', desc: 'special@chars!' },
    { slug: '', desc: 'empty slug' },
    { slug: '   ', desc: 'whitespace-only slug' },
    { slug: 'has.dots', desc: 'dot notation in slug' },
    { slug: 'under_score_not_allowed', desc: 'underscores in slug' },
  ];

  for (const item of invalidSlugs) {
    const req = new NextRequest('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        name: 'Empirical Test Product',
        slug: item.slug,
        price: 99.0,
        stock: 10,
      }),
    });

    const res = await createProductHandler(req);
    const data = await res.json();

    assert(
      res.status === 400 &&
        data.success === false &&
        data.error === 'Slug must be URL-safe lowercase with hyphens',
      `1.1 Product create rejected for ${item.desc} with exact error message`,
      `Status: ${res.status}, Error: "${data.error}"`
    );
  }

  // Direct schema verification for slug boundary
  for (const item of invalidSlugs) {
    const parseResult = adminProductCreateSchema.safeParse({
      name: 'Valid Name',
      slug: item.slug,
      price: 50,
      stock: 5,
    });
    assert(
      !parseResult.success &&
        parseResult.error.issues.some((i) => i.message === 'Slug must be URL-safe lowercase with hyphens'),
      `1.1.b Schema rejects slug "${item.slug}" with verbatim error`
    );
  }

  // 1.2 Create with zero or negative price (0, -10)
  const nonPositiveCreatePrices = [0, -10, -0.01, -99999];
  for (const price of nonPositiveCreatePrices) {
    const req = new NextRequest('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        name: 'Empirical Price Test Product',
        slug: `price-test-${Math.abs(price).toString().replace('.', '-')}`,
        price,
        stock: 10,
      }),
    });

    const res = await createProductHandler(req);
    const data = await res.json();

    assert(
      res.status === 400 &&
        data.success === false &&
        data.error === 'Price must be greater than zero',
      `1.2 Product create with non-positive price (${price}) rejected with "Price must be greater than zero"`,
      `Status: ${res.status}, Error: "${data.error}"`
    );
  }

  // 1.3 Create a valid product for update/delete lifecycle tests
  const validTestSlug = `empirical-test-item-${Date.now()}`;
  let createdProductId = '';
  {
    const req = new NextRequest('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        name: 'EMPIRICAL CYRUX HOODIE',
        slug: validTestSlug,
        price: 240.0,
        stock: 15,
        variants: [
          { size: 'M', stock: 10 },
          { size: 'L', stock: 5 },
        ],
        mediaUrls: ['https://cyrux-store.public.blob.vercel-storage.com/hoodie-1.webp'],
        isBestseller: true,
      }),
    });

    const res = await createProductHandler(req);
    const data = await res.json();
    assert(
      res.status === 201 && data.success === true && Boolean(data.product?.id),
      '1.3 Valid product creation returns HTTP 201 with product ID'
    );
    createdProductId = data.product?.id || '';
  }

  // 1.4 Slug uniqueness collision test
  {
    const req = new NextRequest('http://localhost:3000/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        name: 'Duplicate Slug Product',
        slug: validTestSlug,
        price: 150.0,
        stock: 5,
      }),
    });

    const res = await createProductHandler(req);
    const data = await res.json();
    assert(
      res.status === 409 &&
        data.success === false &&
        data.error === 'Product with this slug already exists',
      '1.4 Duplicate slug rejected with HTTP 409'
    );
  }

  // 1.5 Update with negative price (-5, 0, -100)
  const nonPositiveUpdatePrices = [-5, 0, -100];
  for (const price of nonPositiveUpdatePrices) {
    const req = new NextRequest(`http://localhost:3000/api/admin/products/${createdProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ price }),
    });

    const res = await updateProductHandler(req, {
      params: Promise.resolve({ id: createdProductId }),
    });
    const data = await res.json();

    assert(
      res.status === 400 &&
        data.success === false &&
        data.error === 'Price must be positive',
      `1.5 Product update with negative price (${price}) rejected with "Price must be positive"`,
      `Status: ${res.status}, Error: "${data.error}"`
    );
  }

  // Direct schema verification for update price
  {
    const parseResult = adminProductUpdateSchema.safeParse({ price: -5 });
    assert(
      !parseResult.success &&
        parseResult.error.issues.some((i) => i.message === 'Price must be positive'),
      '1.5.b Update schema rejects price -5 with verbatim "Price must be positive"'
    );
  }

  // 1.6 Successful update with valid values
  {
    const req = new NextRequest(`http://localhost:3000/api/admin/products/${createdProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        price: 260.0,
        stock: 20,
        name: 'EMPIRICAL CYRUX HOODIE V2',
      }),
    });

    const res = await patchProductHandler(req, {
      params: Promise.resolve({ id: createdProductId }),
    });
    const data = await res.json();
    assert(
      res.status === 200 &&
        data.success === true &&
        data.product?.price === 260 &&
        data.product?.stock === 20,
      '1.6 Valid update succeeds with HTTP 200 and updated fields'
    );
  }

  // 1.7 Delete non-existent product ID
  {
    const nonExistentIds = ['non-existent-sku-404', 'prod_9999999999', 'missing_id'];
    for (const badId of nonExistentIds) {
      const req = new NextRequest(`http://localhost:3000/api/admin/products/${badId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });

      const res = await deleteProductHandler(req, {
        params: Promise.resolve({ id: badId }),
      });
      const data = await res.json();

      assert(
        res.status === 404 &&
          data.success === false &&
          data.error.toLowerCase().includes('not found'),
        `1.7 Delete non-existent product (${badId}) returns 404 with "not found"`,
        `Status: ${res.status}, Error: "${data.error}"`
      );
    }
  }

  // 1.8 Delete existing product ID successfully
  {
    const req = new NextRequest(`http://localhost:3000/api/admin/products/${createdProductId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    const res = await deleteProductHandler(req, {
      params: Promise.resolve({ id: createdProductId }),
    });
    const data = await res.json();

    assert(
      res.status === 200 && data.success === true && data.deletedId === createdProductId,
      '1.8 Delete existing product succeeds with HTTP 200'
    );

    // Verify subsequent delete returns 404
    const resAfter = await deleteProductHandler(req, {
      params: Promise.resolve({ id: createdProductId }),
    });
    const dataAfter = await resAfter.json();
    assert(
      resAfter.status === 404 && dataAfter.error.toLowerCase().includes('not found'),
      '1.8.b Subsequent delete of same product ID returns 404 not found'
    );
  }

  // ============================================================================
  // GROUP 2: SETTINGS VALIDATION TESTS
  // ============================================================================
  console.log('\n--- Group 2: Settings Validation Tests ---');

  // 2.1 Phone without + or with invalid country code
  const invalidPhones = [
    { phone: '5551234567', desc: 'missing leading +' },
    { phone: 'invalid', desc: 'pure non-numeric string' },
    { phone: '15551234567', desc: 'US number without +' },
    { phone: '+12', desc: 'too short (+12)' },
    { phone: '+12345678901234567', desc: 'too long (>15 digits)' },
    { phone: '++905321234567', desc: 'double plus sign' },
    { phone: '+00000000', desc: 'less than 10 digits' },
    { phone: 'whatsapp:+905321234567', desc: 'prefix in string' },
  ];

  for (const item of invalidPhones) {
    const req = new NextRequest('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        whatsappNumber: item.phone,
      }),
    });

    const res = await putSettingsHandler(req);
    const data = await res.json();

    assert(
      res.status === 400 &&
        data.success === false &&
        data.error === 'whatsappNumber must be a valid E.164 formatted number starting with +',
      `2.1 Invalid phone (${item.desc}: "${item.phone}") rejected with exact verbatim error`,
      `Status: ${res.status}, Error: "${data.error}"`
    );
  }

  // Direct schema verification for whatsappNumber
  for (const item of invalidPhones) {
    const parseResult = adminSettingsUpdateSchema.safeParse({
      whatsappNumber: item.phone,
    });
    assert(
      !parseResult.success &&
        parseResult.error.issues.some(
          (i) => i.message === 'whatsappNumber must be a valid E.164 formatted number starting with +'
        ),
      `2.1.b Schema rejects phone "${item.phone}" with verbatim error`
    );
  }

  // 2.2 Invalid currency (BTC, JPY, CAD)
  const invalidCurrencies = [
    'BTC',
    'JPY',
    'CAD',
    'AUD',
    'CHF',
    'CNY',
    'RUB',
    'crypto',
    '123',
    'DOLLARS',
  ];

  for (const curr of invalidCurrencies) {
    const req = new NextRequest('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        currency: curr,
      }),
    });

    const res = await putSettingsHandler(req);
    const data = await res.json();

    assert(
      res.status === 400 &&
        data.success === false &&
        data.error === 'currency must be one of: USD, EUR, TRY, GBP',
      `2.2 Invalid currency (${curr}) rejected with exact verbatim error`,
      `Status: ${res.status}, Error: "${data.error}"`
    );
  }

  // Direct schema verification for currency
  for (const curr of invalidCurrencies) {
    const parseResult = adminSettingsUpdateSchema.safeParse({
      currency: curr,
    });
    assert(
      !parseResult.success &&
        parseResult.error.issues.some(
          (i) => i.message === 'currency must be one of: USD, EUR, TRY, GBP'
        ),
      `2.2.b Schema rejects currency "${curr}" with verbatim error`
    );
  }

  // 2.3 Valid store settings update
  const validCurrencies = ['USD', 'EUR', 'TRY', 'GBP'];
  for (const curr of validCurrencies) {
    const validPhone = '+905321234567';
    const req = new NextRequest('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        whatsappNumber: validPhone,
        currency: curr,
        storeName: 'cyrux studio atelier',
      }),
    });

    const res = await putSettingsHandler(req);
    const data = await res.json();
    assert(
      res.status === 200 &&
        data.success === true &&
        data.settings?.currency === curr &&
        data.settings?.whatsappNumber === validPhone,
      `2.3 Valid settings update with currency ${curr} succeeds`
    );
  }

  // ============================================================================
  // GROUP 3: BLOB STORAGE SECURITY TESTS
  // ============================================================================
  console.log('\n--- Group 3: Blob Storage Security Tests ---');

  // 3.1 Unsupported MIME types (application/pdf, text/html, application/x-sh)
  const unsupportedMimeTypes = [
    { type: 'application/pdf', ext: 'pdf' },
    { type: 'text/html', ext: 'html' },
    { type: 'application/x-sh', ext: 'sh' },
    { type: 'application/javascript', ext: 'js' },
    { type: 'application/x-executable', ext: 'bin' },
    { type: 'application/zip', ext: 'zip' },
    { type: 'image/gif', ext: 'gif' }, // Only jpeg, png, webp, avif, mp4, quicktime allowed
    { type: 'image/svg+xml', ext: 'svg' },
    { type: 'text/plain', ext: 'txt' },
  ];

  for (const item of unsupportedMimeTypes) {
    const req = new NextRequest('http://localhost:3000/api/admin/blob/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        filename: `malicious.${item.ext}`,
        contentType: item.type,
        content: 'dummy-content-payload',
      }),
    });

    const res = await blobUploadHandler(req);
    const data = await res.json();

    assert(
      res.status === 400 &&
        data.success === false &&
        data.error.toLowerCase().includes('unsupported media type'),
      `3.1 Unsupported MIME type (${item.type}) rejected by upload endpoint`,
      `Status: ${res.status}, Error: "${data.error}"`
    );
  }

  // Direct validateUploadFile check
  for (const item of unsupportedMimeTypes) {
    let threw = false;
    let errMessage = '';
    try {
      validateUploadFile({
        name: `test.${item.ext}`,
        type: item.type,
        size: 1024,
      });
    } catch (e: any) {
      threw = true;
      errMessage = e.message;
    }
    assert(
      threw && errMessage.includes('Unsupported media type'),
      `3.1.b validateUploadFile throws for MIME type "${item.type}"`
    );
  }

  // 3.2 Oversized files (>15MB image, >50MB video)
  const oversizedCases = [
    {
      name: '16MB JPEG',
      type: 'image/jpeg',
      size: 16 * 1024 * 1024,
      limit: MAX_IMAGE_SIZE,
      shouldFail: true,
    },
    {
      name: '20MB WebP',
      type: 'image/webp',
      size: 20 * 1024 * 1024,
      limit: MAX_IMAGE_SIZE,
      shouldFail: true,
    },
    {
      name: '15MB + 1 byte PNG',
      type: 'image/png',
      size: 15 * 1024 * 1024 + 1,
      limit: MAX_IMAGE_SIZE,
      shouldFail: true,
    },
    {
      name: '51MB MP4',
      type: 'video/mp4',
      size: 51 * 1024 * 1024,
      limit: MAX_VIDEO_SIZE,
      shouldFail: true,
    },
    {
      name: '50MB + 1 byte QuickTime',
      type: 'video/quicktime',
      size: 50 * 1024 * 1024 + 1,
      limit: MAX_VIDEO_SIZE,
      shouldFail: true,
    },
  ];

  for (const c of oversizedCases) {
    let threw = false;
    let errMessage = '';
    try {
      validateUploadFile({
        name: `file.${c.type.split('/')[1]}`,
        type: c.type,
        size: c.size,
      });
    } catch (e: any) {
      threw = true;
      errMessage = e.message;
    }
    assert(
      threw && errMessage.includes('exceeds maximum limit'),
      `3.2 Oversized file (${c.name}: ${c.size} bytes) rejected with limit violation`,
      `Message: "${errMessage}"`
    );
  }

  // Verify boundary acceptance: exactly 15MB image and 50MB video
  {
    let imageOk = false;
    try {
      validateUploadFile({
        name: 'boundary.webp',
        type: 'image/webp',
        size: 15 * 1024 * 1024,
      });
      imageOk = true;
    } catch {}
    assert(imageOk, '3.2.b Exactly 15MB image boundary is accepted');

    let videoOk = false;
    try {
      validateUploadFile({
        name: 'boundary.mp4',
        type: 'video/mp4',
        size: 50 * 1024 * 1024,
      });
      videoOk = true;
    } catch {}
    assert(videoOk, '3.2.c Exactly 50MB video boundary is accepted');
  }

  // 3.3 Deletion URLs with non-Vercel domains, spoofed domains, and path traversal
  const maliciousDeleteUrls = [
    {
      url: 'http://cyrux-store.public.blob.vercel-storage.com/file.webp',
      reason: 'Non-HTTPS protocol (http:)',
    },
    {
      url: 'https://attacker.com/file.webp',
      reason: 'Non-Vercel external domain',
    },
    {
      url: 'https://blob.vercel-storage.com.attacker.com/file.webp',
      reason: 'Spoofed suffix domain (attacker.com)',
    },
    {
      url: 'https://evil-blob.vercel-storage.com.malicious.io/file.webp',
      reason: 'Spoofed host with vercel-storage in subdomain',
    },
    {
      url: 'https://cyrux-store.public.blob.vercel-storage.com/uploads/../../etc/passwd',
      reason: 'Path traversal (..)',
    },
    {
      url: 'https://cyrux-store.public.blob.vercel-storage.com/..%2f..%2fsecret',
      reason: 'Encoded path traversal sequence (..)',
    },
    {
      url: 'ftp://cyrux-store.public.blob.vercel-storage.com/file.webp',
      reason: 'FTP protocol injection',
    },
    {
      url: 'javascript:alert(1)',
      reason: 'javascript: URI scheme',
    },
    {
      url: 'not-a-valid-url',
      reason: 'Malformed URL string',
    },
  ];

  for (const item of maliciousDeleteUrls) {
    const req = new NextRequest('http://localhost:3000/api/admin/blob/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ url: item.url }),
    });

    const res = await blobDeleteHandler(req);
    const data = await res.json();

    assert(
      res.status === 400 && data.success === false,
      `3.3 Malicious delete URL rejected (${item.reason})`,
      `URL: ${item.url}, Status: ${res.status}, Error: "${data.error}"`
    );
  }

  // Direct schema verification for blobDeleteSchema
  for (const item of maliciousDeleteUrls) {
    const schemaResult = blobDeleteSchema.safeParse({ url: item.url });
    assert(
      !schemaResult.success,
      `3.3.b blobDeleteSchema rejects malicious URL (${item.reason})`
    );

    let fnThrew = false;
    try {
      validateDeleteUrl(item.url);
    } catch {
      fnThrew = true;
    }
    assert(
      fnThrew,
      `3.3.c validateDeleteUrl throws for malicious URL (${item.reason})`
    );
  }

  // 3.4 Valid blob lifecycle (Upload -> Verify -> Delete)
  {
    const uploadReq = new NextRequest('http://localhost:3000/api/admin/blob/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        filename: 'empirical-test-artwork.webp',
        contentType: 'image/webp',
        content: 'SAMPLE_WEBP_BINARY_PLACEHOLDER',
      }),
    });

    const uploadRes = await blobUploadHandler(uploadReq);
    const uploadData = await uploadRes.json();

    assert(
      uploadRes.status === 201 &&
        uploadData.success === true &&
        typeof uploadData.url === 'string' &&
        uploadData.url.includes('.blob.vercel-storage.com'),
      '3.4 Valid upload returns HTTP 201 with *.blob.vercel-storage.com URL'
    );

    const uploadedUrl = uploadData.url;

    // Delete uploaded blob
    const deleteReq = new NextRequest('http://localhost:3000/api/admin/blob/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ url: uploadedUrl }),
    });

    const deleteRes = await blobDeleteHandler(deleteReq);
    const deleteData = await deleteRes.json();

    assert(
      deleteRes.status === 200 &&
        deleteData.success === true &&
        deleteData.deletedUrl === uploadedUrl,
      '3.4.b Valid delete of uploaded blob returns HTTP 200 with deletedUrl'
    );
  }

  // 3.5 Unauthenticated access to blob delete returns HTTP 401
  {
    const unauthReq = new NextRequest('http://localhost:3000/api/admin/blob/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://cyrux-store.public.blob.vercel-storage.com/sample.webp',
      }),
    });

    const res = await blobDeleteHandler(unauthReq);
    const data = await res.json();

    assert(
      res.status === 401 && data.success === false && data.error === 'Unauthorized',
      '3.5 Unauthenticated call to /api/admin/blob/delete returns HTTP 401 Unauthorized'
    );
  }

  // ============================================================================
  // GROUP 4: EDGE MIDDLEWARE ROUTE GUARDS
  // ============================================================================
  console.log('\n--- Group 4: Edge Middleware Route Guards ---');

  // 4.1 Unauthenticated /api/admin/products -> HTTP 401
  {
    const req = new NextRequest('http://localhost:3000/api/admin/products', {
      method: 'GET',
    });
    const res = await middleware(req);
    assert(
      res.status === 401,
      '4.1 Middleware intercepts unauthenticated GET /api/admin/products with HTTP 401'
    );
  }

  // 4.2 Unauthenticated /api/admin/settings -> HTTP 401
  {
    const req = new NextRequest('http://localhost:3000/api/admin/settings', {
      method: 'PUT',
    });
    const res = await middleware(req);
    assert(
      res.status === 401,
      '4.2 Middleware intercepts unauthenticated PUT /api/admin/settings with HTTP 401'
    );
  }

  // 4.3 Unauthenticated /admin dashboard -> HTTP 307 redirect to /admin/login
  {
    const req = new NextRequest('http://localhost:3000/admin', {
      method: 'GET',
    });
    const res = await middleware(req);
    assert(
      res.status === 307 && res.headers.get('location')?.includes('/admin/login'),
      '4.3 Middleware redirects unauthenticated /admin navigation to /admin/login'
    );
  }

  // 4.4 Authenticated request to /api/admin/products passes middleware
  {
    const token = await createAdminSessionToken({ email: 'admin@cyrux.studio' });
    const req = new NextRequest('http://localhost:3000/api/admin/products', {
      method: 'GET',
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
    });
    const res = await middleware(req);
    assert(
      res.status === 200,
      '4.4 Middleware permits valid JWT authenticated session on /api/admin/products'
    );
  }

  console.log('\n================================================================');
  console.log(`TOTAL EMPIRICAL CHALLENGE ASSERTIONS: ${totalPassed + totalFailed}`);
  console.log(`PASSED: ${totalPassed}`);
  console.log(`FAILED: ${totalFailed}`);
  console.log('================================================================');

  if (totalFailed > 0) {
    console.error('\nFAILURE DETAILS:');
    failureDetails.forEach((f) => console.error(f));
    return false;
  }
  return true;
}

if (require.main === module) {
  runEmpiricalM4Suite()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('FATAL UNHANDLED ERROR in empirical challenge suite:', err);
      process.exit(1);
    });
}
