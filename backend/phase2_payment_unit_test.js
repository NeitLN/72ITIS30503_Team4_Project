const assert = require('node:assert/strict');
const { fromRpcError } = require('./utils/serviceError');

let paymentService = null;
try {
  paymentService = require('./services/paymentService');
} catch {
  // The first RED run intentionally proves the payment foundation is absent.
}

const checks = [];
const pendingChecks = [];

function test(name, fn) {
  try {
    fn();
    checks.push(true);
    console.log(`[PASS] ${name}`);
  } catch (error) {
    checks.push(false);
    console.error(`[FAIL] ${name} — ${error.message}`);
  }
}

function asyncTest(name, fn) {
  pendingChecks.push((async () => {
    try {
      await fn();
      checks.push(true);
      console.log(`[PASS] ${name}`);
    } catch (error) {
      checks.push(false);
      console.error(`[FAIL] ${name} — ${error.message}`);
    }
  })());
}

function captureServiceError(fn) {
  try {
    fn();
    assert.fail('Expected validation to reject the payment payload.');
  } catch (error) {
    assert.equal(error.code, 'INVALID_PAYMENT_DETAILS');
    assert.equal(error.status, 422);
    return error;
  }
}

test('payment service exists', () => {
  assert.ok(paymentService);
});

test('normalizes the allowlisted simulated-card payload', () => {
  assert.deepEqual(
    paymentService.normalizePayment({
      paymentMethod: 'simulated_card',
      payment: { cardBrand: 'visa', lastFour: '4242' },
    }),
    {
      method: 'simulated_card',
      details: { cardBrand: 'visa', lastFour: '4242', simulationOutcome: 'approved' },
    },
  );
});

test('keeps existing offline methods free of payment details', () => {
  assert.deepEqual(paymentService.normalizePayment({ paymentMethod: 'cod' }), { method: 'cod', details: null });
  assert.deepEqual(paymentService.normalizePayment({ paymentMethod: 'bank_transfer' }), { method: 'bank_transfer', details: null });
});

test('does not confuse legitimate shipping fields with a PIN field', () => {
  assert.deepEqual(
    paymentService.normalizePayment({ paymentMethod: 'cod', shippingFee: 30000 }),
    { method: 'cod', details: null },
  );
});

for (const [name, payment] of [
  ['full card number', { cardBrand: 'visa', lastFour: '4242', cardNumber: '4111111111111111' }],
  ['PAN', { cardBrand: 'visa', lastFour: '4242', pan: '4111111111111111' }],
  ['CVV', { cardBrand: 'visa', lastFour: '4242', cvv: '123' }],
  ['CVC', { cardBrand: 'visa', lastFour: '4242', cvc: '123' }],
  ['PIN', { cardBrand: 'visa', lastFour: '4242', pin: '1234' }],
  ['expiry', { cardBrand: 'visa', lastFour: '4242', expiryDate: '12/30' }],
]) {
  test(`rejects ${name} fields without echoing their values`, () => {
    const error = captureServiceError(() => paymentService.normalizePayment({ paymentMethod: 'simulated_card', payment }));
    for (const value of Object.values(payment)) {
      if (typeof value === 'string' && value.length >= 3) assert.equal(error.message.includes(value), false);
    }
  });
}

test('rejects suspicious long digit sequences in payment values', () => {
  captureServiceError(() => paymentService.normalizePayment({
    paymentMethod: 'simulated_card',
    payment: { cardBrand: 'visa', lastFour: '12345678' },
  }));
});

test('rejects sensitive card-shaped keys anywhere in the checkout payload', () => {
  captureServiceError(() => paymentService.normalizePayment({
    paymentMethod: 'simulated_card',
    payment: { cardBrand: 'visa', lastFour: '4242' },
    fullCardNumber: '4111111111111111',
  }));
});

test('rejects unknown payment methods', () => {
  captureServiceError(() => paymentService.normalizePayment({ paymentMethod: 'crypto', payment: {} }));
});

test('rejects unknown simulated-card brands', () => {
  captureServiceError(() => paymentService.normalizePayment({
    paymentMethod: 'simulated_card',
    payment: { cardBrand: 'unknown', lastFour: '4242' },
  }));
});

for (const value of ['123', '12345', '12a4', '１２３４']) {
  test(`rejects invalid last-four value ${JSON.stringify(value)}`, () => {
    captureServiceError(() => paymentService.normalizePayment({
      paymentMethod: 'simulated_card',
      payment: { cardBrand: 'visa', lastFour: value },
    }));
  });
}

test('safe payment responses expose only allowlisted fields', () => {
  assert.deepEqual(paymentService.toSafePayment({
    id: 'payment-id', state: 'held', payment_method: 'simulated_card', currency: 'VND',
    gross_amount: 100001, platform_fee_total: 10000, seller_amount_total: 90001,
    card_brand: 'visa', card_last_four: '4242', held_at: 'held-at', refunded_at: null,
    metadata: { raw: 'must-not-leak' }, transaction_id: 'must-not-leak', buyer_id: 'must-not-leak',
  }), {
    id: 'payment-id', state: 'held', method: 'simulated_card', currency: 'VND',
    gross_amount: 100001, platform_fee_total: 10000, seller_amount_total: 90001,
    card_brand: 'visa', last_four: '4242', held_at: 'held-at', refunded_at: null,
  });
});

test('maps payment RPC failures to safe client statuses', () => {
  assert.equal(fromRpcError({ message: '{"code":"INVALID_PAYMENT_DETAILS","message":"safe"}' }).status, 422);
  assert.equal(fromRpcError({ message: '{"code":"SIMULATED_PAYMENT_FAILED","message":"safe"}' }).status, 409);
  assert.equal(fromRpcError({ message: '{"code":"INVALID_PAYMENT_TRANSITION","message":"safe"}' }).status, 409);
});

asyncTest('routes simulated-card checkout through paymentService and the v2 RPC only', async () => {
  const supabasePath = require.resolve('./lib/supabase');
  const orderServicePath = require.resolve('./services/orderService');
  const cachedSupabase = require.cache[supabasePath];
  const originalExports = cachedSupabase.exports;
  const calls = [];
  const fakeAdmin = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === 'stylehub_cancel_order') {
        return {
          data: {
            id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            orderCode: 'SH-PHASE2-UNIT',
            status: 'cancelled',
            cancelledItems: 1,
            restoredItems: 1,
            paymentState: 'refunded',
            idempotentReplay: false,
            message: 'safe',
          },
          error: null,
        };
      }
      return {
        data: {
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          orderCode: 'SH-PHASE2-UNIT',
          status: 'pending',
          paymentMethod: 'simulated_card',
          subtotal: 100001,
          shippingFee: 30000,
          discountAmount: 0,
          totalAmount: 130001,
          items: [],
          idempotentReplay: false,
          payment: {
            id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            state: 'held',
            method: 'simulated_card',
            currency: 'VND',
            grossAmount: 130001,
            platformFeeTotal: 13000,
            sellerAmountTotal: 117001,
            cardBrand: 'visa',
            lastFour: '4242',
            heldAt: 'held-at',
            refundedAt: null,
            metadata: { forbidden: true },
            allocations: [{
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              sellerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              state: 'held',
              grossAmount: 130001,
              platformFee: 13000,
              sellerNetAmount: 117001,
              forbidden: true,
            }],
          },
        },
        error: null,
      };
    },
  };

  cachedSupabase.exports = {
    supabase: null,
    isSupabaseConfigured: () => false,
    supabaseAdmin: fakeAdmin,
    isSupabaseAdminConfigured: () => true,
  };
  delete require.cache[orderServicePath];

  try {
    const { cancelOrder, createOrder } = require('./services/orderService');
    const result = await createOrder(
      { id: '11111111-1111-4111-8111-111111111111' },
      {
        customer: {
          name: 'Phase Two Buyer',
          email: 'phase2@example.invalid',
          phone: '0901234567',
          address: '1 Đường QA, Quận 1',
          city: 'Thành phố Hồ Chí Minh',
        },
        paymentMethod: 'simulated_card',
        payment: { cardBrand: 'VISA', lastFour: '4242' },
        items: [{
          productId: '22222222-2222-4222-8222-222222222222',
          variantId: null,
          expectedUnitPrice: 100001,
          quantity: 1,
        }],
      },
      '33333333-3333-4333-8333-333333333333',
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, 'stylehub_checkout_atomic_v2');
    assert.deepEqual(calls[0].args.p_payment_details, {
      cardBrand: 'visa',
      lastFour: '4242',
      simulationOutcome: 'approved',
    });
    assert.deepEqual(Object.keys(calls[0].args).sort(), [
      'p_buyer_id', 'p_coupon_code', 'p_customer', 'p_idempotency_key', 'p_items',
      'p_notes', 'p_payment_details', 'p_payment_method', 'p_request_fingerprint',
    ]);
    assert.deepEqual(result.payment, {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      state: 'held',
      method: 'simulated_card',
      currency: 'VND',
      gross_amount: 130001,
      platform_fee_total: 13000,
      seller_amount_total: 117001,
      card_brand: 'visa',
      last_four: '4242',
      held_at: 'held-at',
      refunded_at: null,
      allocations: [{
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        seller_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        state: 'held',
        gross_amount: 130001,
        platform_fee: 13000,
        seller_net_amount: 117001,
      }],
    });
    assert.equal(JSON.stringify(result).includes('forbidden'), false);

    for (const [index, method] of ['cod', 'bank_transfer'].entries()) {
      await createOrder(
        { id: '11111111-1111-4111-8111-111111111111' },
        {
          customer: {
            name: 'Phase Two Buyer',
            email: 'phase2@example.invalid',
            phone: '0901234567',
            address: '1 Đường QA, Quận 1',
            city: 'Thành phố Hồ Chí Minh',
          },
          paymentMethod: method,
          items: [{
            productId: '22222222-2222-4222-8222-222222222222',
            variantId: null,
            expectedUnitPrice: 100001,
            quantity: 1,
          }],
        },
        `44444444-4444-4444-8444-44444444444${index}`,
      );
    }
    assert.deepEqual(calls.slice(1).map((call) => call.name), [
      'stylehub_checkout_atomic',
      'stylehub_checkout_atomic',
    ]);
    assert.equal(calls.slice(1).some((call) => 'p_payment_details' in call.args), false);

    const cancellation = await cancelOrder(
      { id: '11111111-1111-4111-8111-111111111111', role: 'customer' },
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    );
    assert.equal(cancellation.payment_state, 'refunded');
  } finally {
    cachedSupabase.exports = originalExports;
    delete require.cache[orderServicePath];
  }
});

Promise.all(pendingChecks).then(() => {
  console.log(`\nPHASE 2 PAYMENT UNIT SUMMARY: ${checks.filter(Boolean).length}/${checks.length} passed`);
  if (checks.some((value) => !value)) process.exitCode = 1;
});
