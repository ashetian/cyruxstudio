/**
 * Milestone 3 Remediation: Challenger 1 Empirical Stress Test Harness
 * 
 * Target: POST /api/order/whatsapp and validations
 * Specific requirements tested:
 * 1. Negative & Zero Prices: -1, -999.99, 0 -> Must return HTTP 400
 * 2. Non-numeric Prices: "fifty", NaN, Infinity -> Must return HTTP 400
 * 3. Script tags, SVG/IMG onerror tags in variant & customerNotes -> Sanitized/stripped, verified in decoded URL
 * 4. Non-existent product ID -> Must return HTTP 404
 * 5. Missing required fields -> Must return HTTP 400
 */

import { POST as orderWhatsappHandler } from '../src/app/api/order/whatsapp/route';
import {
  whatsAppOrderApiRequestSchema,
  whatsAppOrderInputSchema,
  validateOrderPayload,
  sanitizeCustomerText,
} from '../src/lib/validations';
import { generateWhatsAppOrderUrl } from '../src/lib/whatsapp';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

const results: TestResult[] = [];

function record(
  category: string,
  name: string,
  condition: boolean,
  expected: string,
  actual: string,
  details?: string
) {
  results.push({ category, name, passed: condition, expected, actual, details });
  if (condition) {
    console.log(`  ✔ [PASS] [${category}] ${name}`);
  } else {
    console.error(`  ✖ [FAIL] [${category}] ${name} | Expected: ${expected} | Actual: ${actual}`);
    if (details) console.error(`    Details: ${details}`);
  }
}

async function callOrderRoute(body: unknown, rawText?: string): Promise<{ status: number; body: any }> {
  let reqBody: string;
  if (rawText !== undefined) {
    reqBody = rawText;
  } else {
    reqBody = JSON.stringify(body);
  }

  const req = new Request('http://localhost:3000/api/order/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: reqBody,
  });

  const res = await orderWhatsappHandler(req);
  let parsedBody: any = null;
  try {
    parsedBody = await res.json();
  } catch (err) {
    parsedBody = null;
  }
  return { status: res.status, body: parsedBody };
}

export async function runRemediationChallengeSuite() {
  console.log('================================================================');
  console.log('   M3 REMEDIATION CHALLENGER 1: EMPIRICAL HARNESS               ');
  console.log('================================================================\n');

  // ============================================================================
  // CATEGORY 1: NEGATIVE & ZERO PRICES
  // ============================================================================
  console.log('--- Category 1: Negative & Zero Prices (Must return 400) ---');

  // 1.1 Price = -1
  {
    const res = await callOrderRoute({ productId: 'prod_1', price: -1 });
    record(
      'Negative & Zero Prices',
      'Price = -1 returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 1.2 Price = -999.99
  {
    const res = await callOrderRoute({ productId: 'prod_1', price: -999.99 });
    record(
      'Negative & Zero Prices',
      'Price = -999.99 returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 1.3 Price = 0
  {
    const res = await callOrderRoute({ productId: 'prod_1', price: 0 });
    record(
      'Negative & Zero Prices',
      'Price = 0 returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 1.4 Price = -0.00001
  {
    const res = await callOrderRoute({ productId: 'prod_1', price: -0.00001 });
    record(
      'Negative & Zero Prices',
      'Price = -0.00001 returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 1.5 Price = -1 with unknown product ID (validation must run before DB)
  {
    const res = await callOrderRoute({ productId: 'non_existent_prod', price: -1 });
    record(
      'Negative & Zero Prices',
      'Price = -1 with non-existent product returns HTTP 400 (validation precedes DB)',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 1.6 Zod Schema directly validates price <= 0
  {
    const parsedNeg = whatsAppOrderApiRequestSchema.safeParse({ productId: 'prod_1', price: -50 });
    const parsedZero = whatsAppOrderApiRequestSchema.safeParse({ productId: 'prod_1', price: 0 });
    record(
      'Negative & Zero Prices',
      'whatsAppOrderApiRequestSchema rejects price <= 0 directly',
      !parsedNeg.success && !parsedZero.success,
      'schema parse fails for -50 and 0',
      `parsedNeg.success = ${parsedNeg.success}, parsedZero.success = ${parsedZero.success}`
    );
  }

  // 1.7 validateOrderPayload throws on price <= 0
  {
    let threwNeg = false;
    let threwZero = false;
    try {
      validateOrderPayload({ productId: 'prod_1', price: -10 });
    } catch {
      threwNeg = true;
    }
    try {
      validateOrderPayload({ productId: 'prod_1', price: 0 });
    } catch {
      threwZero = true;
    }
    record(
      'Negative & Zero Prices',
      'validateOrderPayload strictly throws Error on price <= 0',
      threwNeg && threwZero,
      'both throw Price must be a positive number',
      `threwNeg = ${threwNeg}, threwZero = ${threwZero}`
    );
  }

  // ============================================================================
  // CATEGORY 2: NON-NUMERIC PRICES
  // ============================================================================
  console.log('\n--- Category 2: Non-Numeric Prices (Must return 400) ---');

  // 2.1 String price: "fifty"
  {
    const res = await callOrderRoute({ productId: 'prod_1', price: 'fifty' });
    record(
      'Non-Numeric Prices',
      'Price = "fifty" returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 2.2 String numeric price: "120"
  {
    const res = await callOrderRoute({ productId: 'prod_1', price: '120' });
    record(
      'Non-Numeric Prices',
      'Price = "120" (string) returns HTTP 400 (strict number required)',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 2.3 JSON representation of NaN (JSON.stringify converts NaN to null)
  {
    const res = await callOrderRoute({ productId: 'prod_1', price: null });
    record(
      'Non-Numeric Prices',
      'Price = null (serialized NaN) returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 2.4 Literal raw JSON with NaN syntax
  {
    const res = await callOrderRoute(null, '{"productId":"prod_1","price":NaN}');
    record(
      'Non-Numeric Prices',
      'Raw JSON containing NaN token returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 2.5 Literal raw JSON with Infinity syntax
  {
    const res = await callOrderRoute(null, '{"productId":"prod_1","price":Infinity}');
    record(
      'Non-Numeric Prices',
      'Raw JSON containing Infinity token returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 2.6 Direct schema check with NaN & Infinity
  {
    const parseNaN = whatsAppOrderApiRequestSchema.safeParse({ productId: 'prod_1', price: NaN });
    const parseInf = whatsAppOrderApiRequestSchema.safeParse({ productId: 'prod_1', price: Infinity });
    const parseNegInf = whatsAppOrderApiRequestSchema.safeParse({ productId: 'prod_1', price: -Infinity });
    record(
      'Non-Numeric Prices',
      'whatsAppOrderApiRequestSchema rejects NaN, Infinity, -Infinity',
      !parseNaN.success && !parseInf.success && !parseNegInf.success,
      'all fail schema parsing',
      `parseNaN = ${parseNaN.success}, parseInf = ${parseInf.success}, parseNegInf = ${parseNegInf.success}`
    );
  }

  // 2.7 Boolean price: true
  {
    const res = await callOrderRoute({ productId: 'prod_1', price: true });
    record(
      'Non-Numeric Prices',
      'Price = true (boolean) returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // ============================================================================
  // CATEGORY 3: SCRIPT TAGS, SVG/IMG ONERROR TAGS IN VARIANT & CUSTOMER NOTES
  // ============================================================================
  console.log('\n--- Category 3: Script tags, SVG/IMG onerror tags Sanitization ---');

  // 3.1 Script tag in variant: <script>alert("xss")</script>
  {
    const res = await callOrderRoute({
      productId: 'prod_1',
      variant: '<script>alert("xss")</script>',
    });
    const url = res.body?.redirectUrl || '';
    const decodedUrl = decodeURIComponent(url);
    const noRawScript = !url.includes('%3Cscript%3E') && !url.includes('<script>');
    const noClosingScript = !url.includes('%3C%2Fscript%3E') && !url.includes('</script>');
    const decodedHasNoScript = !decodedUrl.includes('<script>') && !decodedUrl.includes('</script>');
    const cleanedVariantPreserved = decodedUrl.includes('Variant: alert(xss)');

    record(
      'XSS Sanitization',
      'Variant with <script>alert("xss")</script> is stripped and URL is safe',
      res.status === 200 && noRawScript && noClosingScript && decodedHasNoScript && cleanedVariantPreserved,
      'status 200, script tags stripped, cleaned content preserved',
      `status = ${res.status}, decodedUrl contains: ${decodedUrl}`
    );
  }

  // 3.2 Img onerror in variant: <img src=x onerror=alert(1)>
  {
    const res = await callOrderRoute({
      productId: 'prod_1',
      variant: '<img src=x onerror=alert(1)>',
    });
    const url = res.body?.redirectUrl || '';
    const decodedUrl = decodeURIComponent(url);
    const noImg = !decodedUrl.includes('<img') && !decodedUrl.includes('onerror=');
    const noVariantLineIfEmpty = !decodedUrl.includes('Variant:');

    record(
      'XSS Sanitization',
      'Variant with <img src=x onerror=alert(1)> is fully eliminated without dangling tag',
      res.status === 200 && noImg && noVariantLineIfEmpty,
      'status 200, no img tag, no dangling Variant: line',
      `status = ${res.status}, decodedUrl contains Variant: ${decodedUrl.includes('Variant:')}`
    );
  }

  // 3.3 SVG onload in variant: <svg/onload=alert('svg')>
  {
    const res = await callOrderRoute({
      productId: 'prod_1',
      variant: '<svg/onload=alert(1)>',
    });
    const url = res.body?.redirectUrl || '';
    const decodedUrl = decodeURIComponent(url);
    const noSvg = !decodedUrl.includes('<svg') && !decodedUrl.includes('onload=');

    record(
      'XSS Sanitization',
      'Variant with <svg/onload=alert(1)> is completely stripped',
      res.status === 200 && noSvg,
      'status 200, no svg tag in decoded URL',
      `status = ${res.status}, decodedUrl: ${decodedUrl}`
    );
  }

  // 3.4 Script tag in customerNotes: <script>fetch("http://evil.com")</script>
  {
    const res = await callOrderRoute({
      productId: 'prod_1',
      customerNotes: 'Please rush order <script>fetch("http://evil.com")</script> thanks!',
    });
    const url = res.body?.redirectUrl || '';
    const decodedUrl = decodeURIComponent(url);
    const noScript = !decodedUrl.includes('<script>') && !decodedUrl.includes('</script>');
    const noQuotes = !decodedUrl.includes('"') && !decodedUrl.includes("'");
    const preservedText = decodedUrl.includes('Please rush order') && decodedUrl.includes('thanks!');

    record(
      'XSS Sanitization',
      'CustomerNotes with script tag strips script & quotes, preserves text',
      res.status === 200 && noScript && noQuotes && preservedText,
      'status 200, script and quotes stripped, surrounding text preserved',
      `status = ${res.status}, decodedUrl: ${decodedUrl}`
    );
  }

  // 3.5 IMG onerror in customerNotes: <img src="x" onerror="alert(1)"/>
  {
    const res = await callOrderRoute({
      productId: 'prod_1',
      customerNotes: 'Wrap as gift <img src="x" onerror="alert(1)"/> please',
    });
    const url = res.body?.redirectUrl || '';
    const decodedUrl = decodeURIComponent(url);
    const noImg = !decodedUrl.includes('<img') && !decodedUrl.includes('onerror');
    const preserved = decodedUrl.includes('Wrap as gift') && decodedUrl.includes('please');

    record(
      'XSS Sanitization',
      'CustomerNotes with <img onerror> strips tag cleanly',
      res.status === 200 && noImg && preserved,
      'status 200, no img tag in notes',
      `status = ${res.status}, decodedUrl: ${decodedUrl}`
    );
  }

  // 3.6 SVG onload in customerNotes: <svg onload=alert(document.domain)>
  {
    const res = await callOrderRoute({
      productId: 'prod_1',
      customerNotes: '<svg onload=alert(document.domain)>Leave at doorstep',
    });
    const url = res.body?.redirectUrl || '';
    const decodedUrl = decodeURIComponent(url);
    const noSvg = !decodedUrl.includes('<svg') && !decodedUrl.includes('onload');
    const preserved = decodedUrl.includes('Leave at doorstep');

    record(
      'XSS Sanitization',
      'CustomerNotes with <svg onload> strips svg and leaves message',
      res.status === 200 && noSvg && preserved,
      'status 200, no svg in notes',
      `status = ${res.status}, decodedUrl: ${decodedUrl}`
    );
  }

  // 3.7 Dangling angle brackets in variant and customerNotes
  {
    const res = await callOrderRoute({
      productId: 'prod_1',
      variant: '<<>>Size M<<',
      customerNotes: 'Dangling < brackets > and <<unclosed tag',
    });
    const url = res.body?.redirectUrl || '';
    const decodedUrl = decodeURIComponent(url);
    const noAngleBrackets = !decodedUrl.includes('<') && !decodedUrl.includes('>');

    record(
      'XSS Sanitization',
      'Dangling angle brackets (<, >) are completely stripped',
      res.status === 200 && noAngleBrackets,
      'status 200, zero angle brackets in decoded URL',
      `status = ${res.status}, has < or >: ${decodedUrl.includes('<') || decodedUrl.includes('>')}`
    );
  }

  // ============================================================================
  // CATEGORY 4: NON-EXISTENT PRODUCT ID
  // ============================================================================
  console.log('\n--- Category 4: Non-Existent Product ID (Must return 404) ---');

  // 4.1 Non-existent product ID
  {
    const res = await callOrderRoute({ productId: 'non_existent_product_xyz_999' });
    record(
      'Non-Existent Product ID',
      'productId = "non_existent_product_xyz_999" returns HTTP 404',
      res.status === 404 && res.body?.success === false,
      'status === 404 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 4.2 Non-existent UUID-style product ID
  {
    const res = await callOrderRoute({ productId: '99999999-9999-9999-9999-999999999999' });
    record(
      'Non-Existent Product ID',
      'Random UUID product ID returns HTTP 404',
      res.status === 404 && res.body?.success === false,
      'status === 404 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 4.3 Error message identifies the missing ID
  {
    const missingId = 'prod_ghost_404';
    const res = await callOrderRoute({ productId: missingId });
    const hasIdInMsg = res.body?.error?.includes(missingId);
    record(
      'Non-Existent Product ID',
      'HTTP 404 response includes informative error mentioning missing ID',
      res.status === 404 && hasIdInMsg,
      `error message contains "${missingId}"`,
      `body.error = "${res.body?.error}"`
    );
  }

  // ============================================================================
  // CATEGORY 5: MISSING REQUIRED FIELDS
  // ============================================================================
  console.log('\n--- Category 5: Missing Required Fields (Must return 400) ---');

  // 5.1 Empty payload object {}
  {
    const res = await callOrderRoute({});
    record(
      'Missing Required Fields',
      'Empty object {} returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 5.2 Empty string productId: ""
  {
    const res = await callOrderRoute({ productId: '' });
    record(
      'Missing Required Fields',
      'productId = "" returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 5.3 Whitespace-only productId: "   "
  {
    const res = await callOrderRoute({ productId: '   ' });
    record(
      'Missing Required Fields',
      'productId = "   " returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 5.4 Non-string productId: 12345
  {
    const res = await callOrderRoute({ productId: 12345 });
    record(
      'Missing Required Fields',
      'productId = 12345 (number) returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 5.5 Array body: []
  {
    const res = await callOrderRoute([]);
    record(
      'Missing Required Fields',
      'Array body [] returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 5.6 Non-JSON raw string body
  {
    const res = await callOrderRoute(null, 'raw unparsed string');
    record(
      'Missing Required Fields',
      'Non-JSON raw string body returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // 5.7 Missing body / empty string
  {
    const res = await callOrderRoute(null, '');
    record(
      'Missing Required Fields',
      'Empty body returns HTTP 400',
      res.status === 400 && res.body?.success === false,
      'status === 400 and success === false',
      `status = ${res.status}, body = ${JSON.stringify(res.body)}`
    );
  }

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  console.log('\n================================================================');
  console.log('                 M3 REMEDIATION CHALLENGE SUMMARY               ');
  console.log('================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`TOTAL TESTS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.error('FAILURES:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.error(`- [${r.category}] ${r.name}: ${r.actual}`));
    process.exit(1);
  }
}

runRemediationChallengeSuite().catch((err) => {
  console.error('FATAL UNCAUGHT ERROR:', err);
  process.exit(1);
});
