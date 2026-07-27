// Backend-generated, display-only bank transfer instructions for the
// bank_transfer payment method. No new payment/escrow state is created here —
// bank_transfer orders still have no `payments` row; this only computes the
// transfer reference, amount, and expiry that the customer sees. Confirmation
// remains a separate, admin-only workflow (out of scope for this module).

const DEFAULT_TTL_MINUTES = 30;

function getTtlMinutes() {
  const raw = Number(process.env.STYLEHUB_BANK_TRANSFER_TTL_MINUTES);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MINUTES;
}

function getBankConfig() {
  const bankName = String(process.env.STYLEHUB_BANK_NAME || '').trim();
  const accountName = String(process.env.STYLEHUB_BANK_ACCOUNT_NAME || '').trim();
  const accountNumber = String(process.env.STYLEHUB_BANK_ACCOUNT_NUMBER || '').trim();
  return {
    bankName, accountName, accountNumber,
    configured: Boolean(bankName && accountName && accountNumber),
  };
}

// Deterministic, backend-derived reference — never accepts client input.
function buildTransferContent(orderCode) {
  const tail = String(orderCode || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-8);
  return `STYLEHUB ${tail}`;
}

function buildInstructions(order) {
  const config = getBankConfig();
  if (!config.configured) return null;

  const createdAt = order.created_at ? new Date(order.created_at) : new Date();
  const ttlMinutes = getTtlMinutes();
  const expiresAt = new Date(createdAt.getTime() + ttlMinutes * 60 * 1000);
  const isExpired = Date.now() > expiresAt.getTime();

  return {
    bankName: config.bankName,
    accountName: config.accountName,
    accountNumber: config.accountNumber,
    amount: Number(order.total_amount),
    currency: 'VND',
    transferContent: buildTransferContent(order.order_code),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ttlMinutes,
    isExpired,
  };
}

module.exports = { getBankConfig, buildTransferContent, buildInstructions };
