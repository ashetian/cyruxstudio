/**
/**
 * Milestone 3: Adversarial Empirical Challenger Suite
 *
 * Exhaustively stress-tests:
 * 1. API route /api/order/whatsapp HTTP status codes (200, 400, 404, 500)
 * 2. URL format: https://wa.me/<digits>?text=<url_encoded_text>
 * 3. URL encoding: %20, %0A, literal * for WhatsApp markdown
 * 4. Boundary values (variant 50 vs 51 chars, notes 500 vs 501 chars)
 * 5. Security & anti-spoofing (price spoofing from client, XSS injection disarming)
 * 6. High-concurrency & Unicode stress load
 */

import { POST as orderWhatsappHandler } from '../src/app/api/order/whatsapp/route';
import {
  generateWhatsAppOrderUrl,
  sanitizePhoneNumber,
  sanitizeCustomerText,
  getActiveStoreConfig,
} from '../src/lib/whatsapp';
import { validateOrderPayload, whatsAppOrderInputSchema, whatsAppOrderApiRequestSchema } from '../src/lib/validations';

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ✖ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    totalFailed++;
  }
}

async function runEmpiricalSuite() {
  console.log('================================================================');
  console.log('   CHALLENGER 2: EMPIRICAL HARNESS FOR MILESTONE 3 (WHATSAPP)   ');
  console.log('================================================================\n');

  // ============================================================================
  // GROUP 1: API ROUTE HTTP STATUS CODES & PAYLOAD VALIDATION
  // ============================================================================
  console.log('--- Group 1: API Route HTTP Status Codes & Payload Validation ---');

  // 1.1 Non-JSON body
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: 'this is not valid json',
      headers: { 'Content-Type': 'text/plain' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 400 && data.success === false, '1.1 Non-JSON body returns HTTP 400');
  }

  // 1.2 Malformed JSON syntax
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: '{"productId": "prod_1", ',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 400 && data.success === false, '1.2 Malformed JSON syntax returns HTTP 400');
  }

  // 1.3 Primitive / Non-object JSON payloads (array, number, boolean, null)
  for (const invalidPayload of [[], [1, 2, 3], 42, true, 'string']) {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify(invalidPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false,
      `1.3 Primitive payload (${JSON.stringify(invalidPayload)}) returns HTTP 400`
    );
  }

  // 1.4 Missing productId
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ variant: 'M' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false && data.error.includes('productId is required'),
      '1.4 Missing productId returns HTTP 400'
    );
  }

  // 1.5 Empty string productId
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ productId: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 400 && data.success === false, '1.5 Empty string productId returns HTTP 400');
  }

  // 1.6 Whitespace-only productId
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ productId: '     ' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 400 && data.success === false, '1.6 Whitespace-only productId returns HTTP 400');
  }

  // 1.7 Non-string productId (number, object, boolean)
  for (const badId of [12345, true, { id: 'prod_1' }]) {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ productId: badId }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 400 && data.success === false, `1.7 Non-string productId (${typeof badId}) returns HTTP 400`);
  }

  // 1.8 Variant boundary: exactly 50 characters (valid)
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
        variant: 'V'.repeat(50),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 200 && data.success === true, '1.8 Variant boundary: exactly 50 chars returns HTTP 200');
  }

  // 1.9 Variant boundary: 51 characters (invalid -> 400)
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
        variant: 'V'.repeat(51),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false && data.error.includes('variant must be a string up to 50 characters'),
      '1.9 Variant boundary: 51 chars returns HTTP 400'
    );
  }

  // 1.10 Non-string variant (number, array)
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
        variant: 999,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 400 && data.success === false, '1.10 Non-string variant returns HTTP 400');
  }

  // 1.11 CustomerNotes boundary: exactly 500 characters (valid -> 200)
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
        customerNotes: 'N'.repeat(500),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 200 && data.success === true, '1.11 CustomerNotes boundary: 500 chars returns HTTP 200');
  }

  // 1.12 CustomerNotes boundary: 501 characters (invalid -> 400)
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
        customerNotes: 'N'.repeat(501),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false && data.error.includes('customerNotes cannot exceed 500 characters'),
      '1.12 CustomerNotes boundary: 501 chars returns HTTP 400'
    );
  }

  // 1.13 Non-string customerNotes
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
        customerNotes: { note: 'please rush' },
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 400 && data.success === false, '1.13 Non-string customerNotes returns HTTP 400');
  }

  // 1.14 Non-existent product ID with no explicit fallback definition
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ productId: 'non_existent_sku_99999' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 404 && data.success === false, '1.14 Non-existent product ID returns HTTP 404');
  }

  // 1.15 Database Variant Stock Gating: prod_2 variant XL is out of stock (inStock: false)
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_2',
        variant: 'XL',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(
      res.status === 400 &&
        data.success === false &&
        data.error.toLowerCase().includes('out of stock'),
      '1.15 Out-of-stock variant (prod_2 / XL) returns HTTP 400 out of stock'
    );
  }

  // 1.16 Database Variant Stock Gating: case-insensitive check (prod_2 variant "xl")
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_2',
        variant: 'xl',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(
      res.status === 400 &&
        data.success === false &&
        data.error.toLowerCase().includes('out of stock'),
      '1.16 Case-insensitive out-of-stock variant ("xl") returns HTTP 400 out of stock'
    );
  }

  // 1.17 Database Variant Stock Gating: in-stock variant (prod_2 / L) returns 200
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_2',
        variant: 'L',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(
      res.status === 200 && data.success === true && typeof data.redirectUrl === 'string',
      '1.17 In-stock variant (prod_2 / L) returns HTTP 200 with redirectUrl'
    );
  }

  // 1.18 Price Spoofing Prevention: Client attempts to submit spoofed price (0.01 instead of DB price 120.00)
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
        price: 0.01,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 200 && data.success === true, '1.18 Price spoof request returns 200');
    assert(
      data.redirectUrl.includes('120.00') && !data.redirectUrl.includes('0.01'),
      '1.18 Server securely overrides spoofed price with canonical DB price (120.00 USD, not 0.01)'
    );
  }

  // 1.19 Whitespace trimming on productId: "  prod_1  " -> matches prod_1
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ productId: '  prod_1  ' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 200 && data.success === true, '1.19 Whitespace-padded productId is trimmed and succeeds');
  }

  // ============================================================================
  // GROUP 2: REDIRECT URL FORMAT SPECIFICATION (https://wa.me/<digits>?text=...)
  // ============================================================================
  console.log('\n--- Group 2: Redirect URL Format Specification ---');

  // 2.1 Exact regex match for https://wa.me/<digits>?text=<encoded>
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ productId: 'prod_1' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    const urlPattern = /^https:\/\/wa\.me\/\d+\?text=.+$/;
    assert(
      urlPattern.test(data.redirectUrl),
      '2.1 redirectUrl matches strict regex ^https://wa.me/\\d+\\?text=.+$'
    );
  }

  // 2.2 Phone number contains NO non-digit characters (+, spaces, hyphens, parentheses)
  {
    const testPhones = [
      '+90 532 123 45 67',
      '+1 (555) 019-2834',
      '+44-20-7946-0958',
      '0090 555 111 22 33',
    ];
    let allPhonesValid = true;
    for (const rawPhone of testPhones) {
      const sanitized = sanitizePhoneNumber(rawPhone);
      if (!/^\d+$/.test(sanitized)) {
        allPhonesValid = false;
      }
      const url = generateWhatsAppOrderUrl(rawPhone, {
        productId: 'prod_1',
        productName: 'TEST TEE',
        price: 100,
        currency: 'USD',
      });
      if (!url.startsWith(`https://wa.me/${sanitized}?text=`)) {
        allPhonesValid = false;
      }
    }
    assert(
      allPhonesValid,
      '2.2 Phone numbers strictly stripped of all non-digits across international formats'
    );
  }

  // 2.3 sanitizePhoneNumber throws error on empty or digit-less input
  {
    assert(
      (() => {
        try {
          sanitizePhoneNumber('invalid-no-digits');
          return false;
        } catch {
          return true;
        }
      })(),
      '2.3 sanitizePhoneNumber throws on "invalid-no-digits"'
    );

    assert(
      (() => {
        try {
          sanitizePhoneNumber('');
          return false;
        } catch {
          return true;
        }
      })(),
      '2.3 sanitizePhoneNumber throws on empty string'
    );
  }

  // ============================================================================
  // GROUP 3: URL ENCODING & FORMATTING (%20, %0A, literal *)
  // ============================================================================
  console.log('\n--- Group 3: URL Linebreaks, Encoding (%20, %0A, *) & Formatting ---');

  // 3.1 Verification of encoding tokens: %20 (spaces), %0A (linebreaks), literal * (markdown)
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
        variant: 'Size L',
        customerNotes: 'Leave at front door please',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    const rawUrl: string = data.redirectUrl;

    // Check raw URL contains literal * for bold WhatsApp styling
    assert(rawUrl.includes('*NEW%20ORDER%20-%20CYRUX%20STUDIO*'), '3.1 Raw URL contains literal * for bold headline');

    // Check %20 for spaces
    assert(rawUrl.includes('%20'), '3.1 Raw URL encodes spaces as %20');
    assert(!rawUrl.includes(' '), '3.1 Raw URL contains ZERO unencoded spaces');

    // Check %0A for linebreaks
    assert(rawUrl.includes('%0A'), '3.1 Raw URL encodes linebreaks as %0A');
    assert(!rawUrl.includes('\n'), '3.1 Raw URL contains ZERO unencoded line breaks');

    // Check colons encoded as %3A
    assert(rawUrl.includes('%3A'), '3.1 Raw URL encodes colons as %3A');
  }

  // 3.2 Decoded URL Text Manifest Structure
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
        variant: 'Size L',
        customerNotes: 'Express delivery please',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    const urlText = data.redirectUrl.split('?text=')[1];
    const decoded = decodeURIComponent(urlText);
    const lines = decoded.split('\n');

    assert(lines[0] === '*NEW ORDER - CYRUX STUDIO*', '3.2 Line 1 is exact headline: *NEW ORDER - CYRUX STUDIO*');
    assert(lines[1] === 'Product: PRETTY CHAOS TEE', '3.2 Line 2 is canonical product name: Product: PRETTY CHAOS TEE');
    assert(lines[2] === 'Variant: Size L', '3.2 Line 3 is selected variant: Variant: Size L');
    assert(lines[3] === 'Price: 120.00 USD', '3.2 Line 4 is formatted price: Price: 120.00 USD');
    assert(lines.some((l) => l.startsWith('Time: ')), '3.2 Manifest includes ISO timestamp');
    assert(lines.some((l) => l === 'Notes: Express delivery please'), '3.2 Manifest includes customer notes');
    assert(lines.some((l) => l === 'Ref ID: prod_1'), '3.2 Manifest includes Ref ID');
  }

  // 3.3 Graceful omission of optional lines (no variant, no notes)
  {
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    const decoded = decodeURIComponent(data.redirectUrl.split('?text=')[1]);

    assert(!decoded.includes('Variant:'), '3.3 Variant line is gracefully omitted when not provided');
    assert(!decoded.includes('Notes:'), '3.3 Notes line is gracefully omitted when not provided');
    assert(!decoded.includes('\n\n'), '3.3 No empty dangling lines in manifest');
  }

  // 3.4 Neutralization of XSS and Injection Payloads in customerNotes
  {
    const attackPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg/onload=fetch("http://attacker.com")>',
      `'; DROP TABLE "StoreSettings"; --`,
      '\\" OR 1=1; alert("xss") \\\\',
    ];

    for (const attack of attackPayloads) {
      const req = new Request('http://localhost:3000/api/order/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          productId: 'prod_1',
          customerNotes: attack,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await orderWhatsappHandler(req);
      const data = await res.json();
      assert(res.status === 200 && data.success === true, `3.4 Attack payload handled cleanly without crashing`);

      const rawUrl: string = data.redirectUrl;
      const decodedNotes = decodeURIComponent(rawUrl);

      // Verify no script tags or html tags survived
      assert(!decodedNotes.includes('<script>'), '3.4 <script> tag neutralized in decoded text');
      assert(!decodedNotes.includes('</script>'), '3.4 </script> tag neutralized in decoded text');
      assert(!decodedNotes.includes('<img'), '3.4 <img tag neutralized in decoded text');
      assert(!decodedNotes.includes('<svg'), '3.4 <svg tag neutralized in decoded text');
      assert(!decodedNotes.includes('"') && !decodedNotes.includes("'"), '3.4 Quotes stripped from customer notes');
      assert(!decodedNotes.includes(';'), '3.4 Semicolons stripped from customer notes');
      assert(!decodedNotes.includes('\\'), '3.4 Backslashes stripped from customer notes');
    }
  }

  // 3.5 Currency override validation & handling
  {
    const currencies = ['EUR', 'TRY', 'GBP', 'usd', '  eur  '];
    for (const curr of currencies) {
      const req = new Request('http://localhost:3000/api/order/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          productId: 'prod_1',
          currency: curr,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await orderWhatsappHandler(req);
      const data = await res.json();
      const expectedCurr = curr.trim().toUpperCase();
      assert(
        data.redirectUrl.includes(expectedCurr),
        `3.5 Currency override "${curr}" formatted as "${expectedCurr}" in order URL`
      );
    }
  }

  // ============================================================================
  // GROUP 4: CONCURRENCY & STRESS LOAD
  // ============================================================================
  console.log('\n--- Group 4: Concurrency & Stress Load ---');

  // 4.1 Rapid sequential requests (50 iterations)
  {
    let allSequentialPassed = true;
    const startSeq = Date.now();
    for (let i = 0; i < 50; i++) {
      const req = new Request('http://localhost:3000/api/order/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          productId: 'prod_1',
          variant: i % 2 === 0 ? 'M' : 'L',
          customerNotes: `Rapid order #${i}`,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await orderWhatsappHandler(req);
      const data = await res.json();
      if (res.status !== 200 || !data.success || !data.redirectUrl.startsWith('https://wa.me/')) {
        allSequentialPassed = false;
      }
    }
    const elapsedSeq = Date.now() - startSeq;
    assert(
      allSequentialPassed,
      `4.1 50 rapid sequential orders succeeded cleanly in ${elapsedSeq}ms`
    );
  }

  // 4.2 Parallel concurrent requests (20 requests with Promise.all)
  {
    const startPar = Date.now();
    const promises = Array.from({ length: 20 }, (_, idx) => {
      const req = new Request('http://localhost:3000/api/order/whatsapp', {
        method: 'POST',
        body: JSON.stringify({
          productId: 'prod_1',
          variant: 'XL',
          customerNotes: `Parallel batch worker ${idx}`,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      return orderWhatsappHandler(req).then((res) => res.json());
    });

    const results = await Promise.all(promises);
    const allParallelPassed = results.every(
      (r) => r.success === true && typeof r.redirectUrl === 'string' && r.redirectUrl.startsWith('https://wa.me/')
    );
    const elapsedPar = Date.now() - startPar;
    assert(
      allParallelPassed,
      `4.2 20 parallel concurrent orders resolved without state race in ${elapsedPar}ms`
    );
  }

  // 4.3 Multilingual Unicode & Emoji stress in customer notes
  {
    const unicodeNotes = 'Lütfen kargo paketini çift sarın. Teşekkürler! 🖤 🛸 ⚡️ 日本語テスト';
    const req = new Request('http://localhost:3000/api/order/whatsapp', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'prod_1',
        customerNotes: unicodeNotes,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await orderWhatsappHandler(req);
    const data = await res.json();
    assert(res.status === 200 && data.success === true, '4.3 Multilingual Unicode & emoji notes return HTTP 200');

    const decoded = decodeURIComponent(data.redirectUrl.split('?text=')[1]);
    assert(decoded.includes('Lütfen kargo paketini çift sarın'), '4.3 Turkish characters preserved');
    assert(decoded.includes('🖤') && decoded.includes('🛸'), '4.3 Emojis preserved in decoded text');
    assert(decoded.includes('日本語テスト'), '4.3 CJK characters preserved in decoded text');
  }

  console.log('\n================================================================');
  console.log(`TOTAL EMPIRICAL CHALLENGE ASSERTIONS: ${totalPassed + totalFailed}`);
  console.log(`PASSED: ${totalPassed}`);
  console.log(`FAILED: ${totalFailed}`);
  console.log('================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEmpiricalSuite().catch((err) => {
  console.error('FATAL UNHANDLED ERROR in empirical challenge suite:', err);
  process.exit(1);
});
