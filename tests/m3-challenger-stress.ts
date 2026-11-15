/**
 * cyrux studio - Challenger 1 Empirical Stress Test Harness for Milestone 3 (WhatsApp Ordering Flow)
 *
 * Exhaustively stress-tests:
 * 1. XSS & SQLi Sanitization on customer notes, length boundaries (500 limit).
 * 2. Phone number normalization edge cases (Turkish domestic, international, non-digits).
 * 3. Out-of-stock product and variant ordering attempts via /api/order/whatsapp.
 * 4. Price spoofing prevention and database canonical resolution.
 * 5. High-concurrency burst requests and API resilience.
 */

import prisma from "../src/lib/db";
import {
  sanitizeCustomerText,
  validateOrderPayload,
  whatsAppOrderInputSchema,
  whatsAppOrderApiRequestSchema,
} from "../src/lib/validations";
import {
  sanitizePhoneNumber,
  generateWhatsAppOrderUrl,
  getActiveStoreConfig,
  generateDynamicWhatsAppOrderUrl,
} from "../src/lib/whatsapp";
import { POST as orderWhatsappHandler } from "../src/app/api/order/whatsapp/route";

let totalPassed = 0;
let totalFailed = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${testName}`);
    totalPassed++;
  } else {
    const msg = `✖ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`;
    console.error(`  ${msg}`);
    failures.push(msg);
    totalFailed++;
  }
}

async function runM3ChallengerSuite() {
  console.log("================================================================");
  console.log("   CHALLENGER 1: M3 EMPIRICAL STRESS & ADVERSARIAL SUITE        ");
  console.log("================================================================\n");

  // ============================================================================
  // 1. XSS SANITIZATION & CUSTOMER NOTES EMPIRICAL TESTS
  // ============================================================================
  console.log("--- 1. XSS & SQL Injection Sanitization Stress Tests ---");

  // 1.1: Classic script tag payload
  const xssScript = '<script>alert(1)</script>';
  const cleanScript = sanitizeCustomerText(xssScript);
  assert(
    !cleanScript.includes('<script>') && !cleanScript.includes('</script>') && cleanScript === 'alert(1)',
    '1.1 Strip <script>alert(1)</script> tags cleanly',
    `got: "${cleanScript}"`
  );

  // 1.2: Img onerror payload
  const xssImg = '<img src=x onerror=alert(1)>';
  const cleanImg = sanitizeCustomerText(xssImg);
  assert(
    !cleanImg.includes('<img') && !cleanImg.includes('onerror') && cleanImg === '',
    '1.2 Strip <img src=x onerror=alert(1)> payload completely',
    `got: "${cleanImg}"`
  );

  // 1.3: Img with quotes and space inside
  const xssImgQuotes = 'Please gift wrap <img src="x" onerror="alert(\'pwned\')"/> thanks';
  const cleanImgQuotes = sanitizeCustomerText(xssImgQuotes);
  assert(
    !cleanImgQuotes.includes('<img') &&
      !cleanImgQuotes.includes('alert') &&
      cleanImgQuotes.includes('Please gift wrap') &&
      cleanImgQuotes.includes('thanks'),
    '1.3 Strip quoted <img onerror> tag while preserving surround text',
    `got: "${cleanImgQuotes}"`
  );

  // 1.4: SVG onload payload
  const xssSvg = '<svg/onload=alert(document.cookie)>';
  const cleanSvg = sanitizeCustomerText(xssSvg);
  assert(
    !cleanSvg.includes('<svg') && !cleanSvg.includes('onload'),
    '1.4 Strip <svg/onload=...> tag cleanly',
    `got: "${cleanSvg}"`
  );

  // 1.5: SQL Injection delimiters and keywords
  const sqli1 = "'; DROP TABLE \"Product\"; --";
  const cleanSqli1 = sanitizeCustomerText(sqli1);
  assert(
    !cleanSqli1.includes("'") && !cleanSqli1.includes(";") && !cleanSqli1.includes('"'),
    '1.5 Strip SQL quotes, double quotes, and semicolons from DROP TABLE',
    `got: "${cleanSqli1}"`
  );

  const sqli2 = "1' OR '1'='1";
  const cleanSqli2 = sanitizeCustomerText(sqli2);
  assert(
    cleanSqli2 === '1 OR 1=1',
    '1.6 Strip quotes from boolean SQL injection (1\' OR \'1\'=\'1\')',
    `got: "${cleanSqli2}"`
  );

  const sqli3 = "admin'--\\";
  const cleanSqli3 = sanitizeCustomerText(sqli3);
  assert(
    cleanSqli3 === 'admin--',
    '1.7 Strip backslashes and single quotes from comment injection',
    `got: "${cleanSqli3}"`
  );

  // 1.8: Customer notes length boundary (499, 500, 501 characters)
  const notes499 = 'A'.repeat(499);
  const notes500 = 'B'.repeat(500);
  const notes501 = 'C'.repeat(501);

  // Test with validateOrderPayload
  const res499 = validateOrderPayload({ productId: 'prod_1', customerNotes: notes499 });
  assert(res499.customerNotes?.length === 499, '1.8 validateOrderPayload accepts 499 chars');

  const res500 = validateOrderPayload({ productId: 'prod_1', customerNotes: notes500 });
  assert(res500.customerNotes?.length === 500, '1.9 validateOrderPayload accepts exactly 500 chars');

  let throwsOn501 = false;
  try {
    validateOrderPayload({ productId: 'prod_1', customerNotes: notes501 });
  } catch (err: any) {
    throwsOn501 = err.message.includes('customerNotes cannot exceed 500 characters');
  }
  assert(throwsOn501, '1.10 validateOrderPayload strictly rejects 501 chars');

  // Test with whatsAppOrderInputSchema (Zod)
  const zodPass500 = whatsAppOrderInputSchema.safeParse({
    productId: 'prod_1',
    productName: 'Tee',
    price: 100,
    customerNotes: notes500,
  });
  assert(zodPass500.success, '1.11 whatsAppOrderInputSchema accepts 500 chars');

  const zodFail501 = whatsAppOrderInputSchema.safeParse({
    productId: 'prod_1',
    productName: 'Tee',
    price: 100,
    customerNotes: notes501,
  });
  assert(!zodFail501.success, '1.12 whatsAppOrderInputSchema rejects 501 chars');

  // Test with API endpoint: 501 chars returns HTTP 400
  const apiReq501 = new Request('http://localhost:3000/api/order/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: 'prod_1', customerNotes: notes501 }),
  });
  const apiRes501 = await orderWhatsappHandler(apiReq501);
  const apiData501 = await apiRes501.json();
  assert(
    apiRes501.status === 400 && apiData501.error?.includes('500 characters'),
    '1.13 POST /api/order/whatsapp rejects 501 chars with HTTP 400',
    `status: ${apiRes501.status}, error: ${apiData501.error}`
  );

  // 1.14: 50,000 char ReDoS/large text attack on API
  const apiReqHuge = new Request('http://localhost:3000/api/order/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: 'prod_1', customerNotes: 'X'.repeat(50000) }),
  });
  const t0 = Date.now();
  const apiResHuge = await orderWhatsappHandler(apiReqHuge);
  const elapsedHuge = Date.now() - t0;
  assert(
    apiResHuge.status === 400 && elapsedHuge < 500,
    '1.14 Large string (50,000 chars) rejected in <500ms without ReDoS',
    `took ${elapsedHuge}ms, status: ${apiResHuge.status}`
  );

  // 1.15: Multilingual Turkish characters, emojis, and newlines in notes
  const complexNotes = 'Lütfen hızlı kargo 🚀\nKapı kodu: #1234\nNot: ğüşıöç / Özel üretim';
  const cleanComplex = sanitizeCustomerText(complexNotes);
  assert(
    cleanComplex.includes('ğüşıöç') && cleanComplex.includes('🚀') && cleanComplex.includes('Özel üretim'),
    '1.15 Preserves Turkish characters, emojis, and valid punctuation in notes',
    `got: "${cleanComplex}"`
  );

  // ============================================================================
  // 2. PHONE NUMBER NORMALIZATION EMPIRICAL TESTS
  // ============================================================================
  console.log('\n--- 2. Phone Number Normalization Stress Tests ---');

  // 2.1: +90 (555) 123-4567
  const phoneTurkishFormatted = '+90 (555) 123-4567';
  const normTurkish = sanitizePhoneNumber(phoneTurkishFormatted);
  assert(
    normTurkish === '905551234567',
    '2.1 Normalize +90 (555) 123-4567 -> 905551234567',
    `got: "${normTurkish}"`
  );

  // 2.2: 05551234567 (Turkish domestic format with leading zero)
  const phoneDomestic = '05551234567';
  const normDomestic = sanitizePhoneNumber(phoneDomestic);
  assert(
    normDomestic === '05551234567',
    '2.2 Clean digits from domestic number 05551234567 -> 05551234567',
    `got: "${normDomestic}"`
  );

  // 2.3: US formatted with parenthesis and dash (+1 (555) 019-2834)
  const phoneUS = '+1 (555) 019-2834';
  const normUS = sanitizePhoneNumber(phoneUS);
  assert(
    normUS === '15550192834',
    '2.3 Normalize +1 (555) 019-2834 -> 15550192834',
    `got: "${normUS}"`
  );

  // 2.4: UK international (+44 20 7946 0999)
  const phoneUK = '+44 20 7946 0999';
  const normUK = sanitizePhoneNumber(phoneUK);
  assert(
    normUK === '442079460999',
    '2.4 Normalize UK +44 20 7946 0999 -> 442079460999',
    `got: "${normUK}"`
  );

  // 2.5: Messy string with dots, spaces, dashes (+90.555.123.45.67)
  const phoneDotted = '+90.555.123.45.67';
  const normDotted = sanitizePhoneNumber(phoneDotted);
  assert(
    normDotted === '905551234567',
    '2.5 Normalize dotted +90.555.123.45.67 -> 905551234567',
    `got: "${normDotted}"`
  );

  // 2.6: Invalid non-digit string throws error
  let threwOnNonDigits = false;
  try {
    sanitizePhoneNumber('invalid-no-digits');
  } catch (err: any) {
    threwOnNonDigits = err.message.includes('no digits found');
  }
  assert(threwOnNonDigits, '2.6 Throws on string with zero digits');

  // 2.7: Empty string throws error
  let threwOnEmpty = false;
  try {
    sanitizePhoneNumber('');
  } catch (err: any) {
    threwOnEmpty = err.message.includes('no digits found');
  }
  assert(threwOnEmpty, '2.7 Throws on empty string');

  // 2.8: Punctuation-only string throws error
  let threwOnPunctuation = false;
  try {
    sanitizePhoneNumber('---(  )+++...');
  } catch (err: any) {
    threwOnPunctuation = err.message.includes('no digits found');
  }
  assert(threwOnPunctuation, '2.8 Throws on punctuation-only string');

  // 2.9: generateWhatsAppOrderUrl produces valid wa.me URL with clean phone
  const testOrder = {
    productId: 'prod_1',
    productName: 'CHAOS TEE',
    price: 120,
    currency: 'USD',
  };
  const urlTurkish = generateWhatsAppOrderUrl('+90 (555) 123-4567', testOrder);
  assert(
    urlTurkish.startsWith('https://wa.me/905551234567?text='),
    '2.9 generateWhatsAppOrderUrl formats clean wa.me target with international code',
    `url: ${urlTurkish}`
  );

  // ============================================================================
  // 3. OUT-OF-STOCK PRODUCT & VARIANT ORDER ATTEMPTS VIA /api/order/whatsapp
  // ============================================================================
  console.log('\n--- 3. Out-of-Stock Handling via /api/order/whatsapp ---');

  // 3.1: Attempt to order out-of-stock variant on prod_2 (variant "XL" is inStock: false)
  const oosVariantReq = new Request('http://localhost:3000/api/order/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: 'prod_2',
      variant: 'XL',
    }),
  });
  const oosVariantRes = await orderWhatsappHandler(oosVariantReq);
  const oosVariantData = await oosVariantRes.json();
  assert(
    oosVariantRes.status === 400 &&
      oosVariantData.success === false &&
      oosVariantData.error?.includes('out of stock'),
    '3.1 Reject order for out-of-stock variant "XL" on prod_2 (HTTP 400)',
    `status: ${oosVariantRes.status}, error: ${oosVariantData.error}`
  );

  // 3.2: Case-insensitive variant out-of-stock matching ("xl" lowercase)
  const oosLowerVariantReq = new Request('http://localhost:3000/api/order/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: 'prod_2',
      variant: 'xl',
    }),
  });
  const oosLowerVariantRes = await orderWhatsappHandler(oosLowerVariantReq);
  const oosLowerVariantData = await oosLowerVariantRes.json();
  assert(
    oosLowerVariantRes.status === 400 &&
      oosLowerVariantData.error?.includes('out of stock'),
    '3.2 Reject order for lowercase "xl" variant on prod_2',
    `status: ${oosLowerVariantRes.status}, error: ${oosLowerVariantData.error}`
  );

  // 3.3: Attempt to order in-stock variant on prod_2 (variant "L" is inStock: true)
  const inStockVariantReq = new Request('http://localhost:3000/api/order/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: 'prod_2',
      variant: 'L',
    }),
  });
  const inStockVariantRes = await orderWhatsappHandler(inStockVariantReq);
  const inStockVariantData = await inStockVariantRes.json();
  assert(
    inStockVariantRes.status === 200 &&
      inStockVariantData.success === true &&
      inStockVariantData.redirectUrl?.includes('Variant%3A%20L'),
    '3.3 Allow order for in-stock variant "L" on prod_2 (HTTP 200)',
    `status: ${inStockVariantRes.status}, redirectUrl: ${inStockVariantData.redirectUrl}`
  );

  // 3.4: Order product with stock = 0 in database
  // Create a temporary out-of-stock product
  const tempOosId = 'test_oos_challenger_' + Date.now();
  await prisma.product.create({
    data: {
      id: tempOosId,
      name: 'DEPLETED ARCHIVE HOODIE',
      slug: 'depleted-archive-hoodie-' + Date.now(),
      description: 'Zero stock archive garment for stress testing.',
      price: 280.0,
      stock: 0, // Out of stock!
      variants: [],
      mediaUrls: ['/assets/test.png'],
      isBestseller: false,
    },
  });

  try {
    const oosProdReq = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: tempOosId,
      }),
    });
    const oosProdRes = await orderWhatsappHandler(oosProdReq);
    const oosProdData = await oosProdRes.json();
    assert(
      oosProdRes.status === 400 &&
        oosProdData.success === false &&
        oosProdData.error?.includes('Product is out of stock'),
      '3.4 Reject order when product.stock = 0 (HTTP 400 "Product is out of stock")',
      `status: ${oosProdRes.status}, error: ${oosProdData.error}`
    );
  } finally {
    // Clean up temporary test product
    await prisma.product.delete({ where: { id: tempOosId } });
  }

  // ============================================================================
  // 4. PRICE SPOOFING PREVENTION & DATA INTEGRITY
  // ============================================================================
  console.log('\n--- 4. Price Spoofing & Redirection Integrity Tests ---');

  // 4.1: Attempt client price-spoofing on prod_1 (real price is 120.00 USD, client claims 1.00 USD)
  const spoofReq = new Request('http://localhost:3000/api/order/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: 'prod_1',
      productName: 'SPOOFED TEE NAME',
      price: 1.0,
      currency: 'USD',
    }),
  });
  const spoofRes = await orderWhatsappHandler(spoofReq);
  const spoofData = await spoofRes.json();
  assert(
    spoofRes.status === 200 &&
      spoofData.redirectUrl?.includes('120.00%20USD') &&
      !spoofData.redirectUrl?.includes('1.00%20USD') &&
      spoofData.redirectUrl?.includes('PRETTY%20CHAOS%20TEE'),
    '4.1 Server overrides client-spoofed price ($1.00 -> $120.00) from DB product record',
    `redirectUrl: ${spoofData.redirectUrl}`
  );

  // 4.2: Non-existent product ID with no fallback product details returns 404
  const notFoundReq = new Request('http://localhost:3000/api/order/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: 'unknown_ghost_item_99999',
    }),
  });
  const notFoundRes = await orderWhatsappHandler(notFoundReq);
  const notFoundData = await notFoundRes.json();
  assert(
    notFoundRes.status === 404 && notFoundData.error?.includes('Product not found'),
    '4.2 Return 404 when product is not in DB and no fallback details provided',
    `status: ${notFoundRes.status}, error: ${notFoundData.error}`
  );

  // 4.3: Order formatting without optional fields (no variant, no notes)
  const cleanUrl = generateWhatsAppOrderUrl('+905551234567', {
    productId: 'prod_minimal',
    productName: 'MINIMAL TEE',
    price: 80,
    currency: 'USD',
  });
  const decodedClean = decodeURIComponent(cleanUrl);
  assert(
    !decodedClean.includes('Variant:') && !decodedClean.includes('Notes:') && !decodedClean.includes('Time:'),
    '4.3 WhatsApp message cleanly omits Variant:, Notes:, and Time: when empty',
    `decoded: "${decodedClean}"`
  );

  // ============================================================================
  // 5. RAPID CONCURRENCY & MALFORMED PAYLOAD RESILIENCE
  // ============================================================================
  console.log('\n--- 5. Concurrency & Malformed Request Resilience ---');

  // 5.1: Malformed JSON syntax
  const badJsonReq = new Request('http://localhost:3000/api/order/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"productId": "prod_1", unclosed_json...',
  });
  const badJsonRes = await orderWhatsappHandler(badJsonReq);
  assert(badJsonRes.status === 400, '5.1 Malformed JSON syntax returns HTTP 400');

  // 5.2: Non-object payload (JSON array)
  const arrayReq = new Request('http://localhost:3000/api/order/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(['item1', 'item2']),
  });
  const arrayRes = await orderWhatsappHandler(arrayReq);
  const arrayData = await arrayRes.json();
  assert(
    arrayRes.status === 400 && arrayData.error?.includes('Payload must be an object'),
    '5.2 JSON array payload rejected with HTTP 400'
  );

  // 5.3: Empty or whitespace-only productId
  const emptyIdReq = new Request('http://localhost:3000/api/order/whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: '   ' }),
  });
  const emptyIdRes = await orderWhatsappHandler(emptyIdReq);
  assert(emptyIdRes.status === 400, '5.3 Whitespace productId rejected with HTTP 400');

  // 5.4: 30 concurrent rapid requests
  const concurrentPromises = Array.from({ length: 30 }, (_, i) => {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'prod_1',
        variant: 'Size L',
        customerNotes: `Burst order test #${i + 1}`,
      }),
    });
    return orderWhatsappHandler(req);
  });

  const responses = await Promise.all(concurrentPromises);
  const all200 = responses.every((r) => r.status === 200);
  assert(all200, '5.4 30 concurrent orders processed successfully with HTTP 200');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log(`TOTAL M3 CHALLENGER ASSERTIONS: ${totalPassed + totalFailed}`);
  console.log(`PASSED: ${totalPassed}`);
  console.log(`FAILED: ${totalFailed}`);
  console.log('================================================================');

  if (totalFailed > 0) {
    console.error('\nFAILED ASSERTIONS:');
    failures.forEach((f) => console.error('  ' + f));
    process.exit(1);
  }
}

runM3ChallengerSuite()
  .catch((err) => {
    console.error('FATAL UNCAUGHT ERROR IN M3 CHALLENGER SUITE:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
