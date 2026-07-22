const { supabaseAdmin, isSupabaseAdminConfigured } = require('../lib/supabase');
const { ServiceError } = require('../utils/serviceError');

const PAYMENT_METHODS = new Set(['cod', 'bank_transfer', 'simulated_card']);
const SIMULATED_CARD_BRANDS = new Set(['visa', 'mastercard', 'amex']);
const PAYMENT_DETAIL_KEYS = new Set(['cardBrand', 'lastFour', 'simulationOutcome']);
const SAFE_VALIDATION_MESSAGE = 'Thông tin thẻ mô phỏng không hợp lệ.';

function invalidPayment() {
  return new ServiceError('INVALID_PAYMENT_DETAILS', SAFE_VALIDATION_MESSAGE, 422);
}

function normalizedKey(value) {
  return String(value).replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function containsSensitiveKey(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).some(([key, nested]) => {
    const keyName = normalizedKey(key);
    const sensitive = keyName.includes('cardnumber')
      || keyName.includes('accountnumber')
      || /^(pan|cvv|cvc|pin)(code|value|number)?$/.test(keyName)
      || /^card(cvv|cvc|pin)$/.test(keyName)
      || /(expiry|expiration|trackdata|magstripe|magneticstripe|securitycode)/.test(keyName);
    return sensitive
      || containsSensitiveKey(nested);
  });
}

function containsLongDigitSequence(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return /\d{8,}/.test(String(value));
  }
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some(containsLongDigitSequence);
}

function normalizePayment(payload) {
  if (containsSensitiveKey(payload)) throw invalidPayment();
  const method = String(payload?.paymentMethod || 'cod').trim().toLowerCase();
  if (!PAYMENT_METHODS.has(method)) throw invalidPayment();

  const details = payload?.payment;
  if (method !== 'simulated_card') {
    if (details != null) throw invalidPayment();
    return { method, details: null };
  }

  if (!details || typeof details !== 'object' || Array.isArray(details)) throw invalidPayment();
  if (containsSensitiveKey(details) || containsLongDigitSequence(details)) throw invalidPayment();

  const keys = Object.keys(details);
  if (keys.some((key) => !PAYMENT_DETAIL_KEYS.has(key))) throw invalidPayment();

  const cardBrand = String(details.cardBrand || '').trim().toLowerCase();
  const lastFour = String(details.lastFour || '').trim();
  const simulationOutcome = String(details.simulationOutcome || 'approved').trim().toLowerCase();
  if (!SIMULATED_CARD_BRANDS.has(cardBrand) || !/^\d{4}$/.test(lastFour)) throw invalidPayment();
  if (!['approved', 'declined'].includes(simulationOutcome)) throw invalidPayment();
  if (simulationOutcome === 'declined'
      && process.env.NODE_ENV !== 'test'
      && process.env.STYLEHUB_ALLOW_SIMULATED_DECLINE !== 'true') {
    throw invalidPayment();
  }

  return { method, details: { cardBrand, lastFour, simulationOutcome } };
}

function toSafePayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    state: row.state,
    method: row.payment_method ?? row.method,
    currency: row.currency,
    gross_amount: Number(row.gross_amount ?? row.grossAmount),
    platform_fee_total: Number(row.platform_fee_total ?? row.platformFeeTotal),
    seller_amount_total: Number(row.seller_amount_total ?? row.sellerAmountTotal),
    card_brand: row.card_brand ?? row.cardBrand ?? null,
    last_four: row.card_last_four ?? row.lastFour ?? null,
    held_at: row.held_at ?? row.heldAt ?? null,
    refunded_at: row.refunded_at ?? row.refundedAt ?? null,
  };
}

function toSafeAllocation(row) {
  return {
    id: row.id,
    seller_id: row.seller_id ?? row.sellerId,
    state: row.state,
    gross_amount: Number(row.gross_amount ?? row.grossAmount),
    platform_fee: Number(row.platform_fee ?? row.platformFee),
    seller_net_amount: Number(row.seller_net_amount ?? row.sellerNetAmount),
  };
}

function toSafeCheckoutPayment(row) {
  if (!row) return null;
  return {
    ...toSafePayment(row),
    allocations: (row.allocations || []).map(toSafeAllocation),
  };
}

async function getOrderPayment(orderId) {
  if (!isSupabaseAdminConfigured()) return null;
  const { data: payment, error } = await supabaseAdmin
    .from('payments')
    .select('id,state,payment_method,currency,gross_amount,platform_fee_total,seller_amount_total,card_brand,card_last_four,held_at,refunded_at')
    .eq('order_id', orderId)
    .eq('payment_method', 'simulated_card')
    .maybeSingle();
  if (error || !payment) return null;

  const { data: allocations, error: allocationError } = await supabaseAdmin
    .from('payment_allocations')
    .select('id,seller_id,state,gross_amount,platform_fee,seller_net_amount')
    .eq('payment_id', payment.id)
    .order('seller_id', { ascending: true });
  if (allocationError) return { ...toSafePayment(payment), allocations: [] };
  return { ...toSafePayment(payment), allocations: (allocations || []).map(toSafeAllocation) };
}

module.exports = {
  PAYMENT_METHODS,
  SIMULATED_CARD_BRANDS,
  normalizePayment,
  toSafePayment,
  toSafeAllocation,
  toSafeCheckoutPayment,
  getOrderPayment,
};
