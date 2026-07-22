const RPC_STATUS_BY_CODE = {
  AUTH_REQUIRED: 401,
  INVALID_CHECKOUT_PAYLOAD: 422,
  INVALID_IDEMPOTENCY_KEY: 400,
  CHECKOUT_IDEMPOTENCY_CONFLICT: 409,
  PRODUCT_UNAVAILABLE: 409,
  INSUFFICIENT_STOCK: 409,
  PRICE_CHANGED: 409,
  INVALID_VARIANT: 409,
  SELF_PURCHASE_NOT_ALLOWED: 409,
  COUPON_INVALID: 400,
  COUPON_LIMIT_REACHED: 409,
  ORDER_NOT_CANCELLABLE: 409,
  INVENTORY_ALREADY_RESTORED: 409,
  INVENTORY_RESTORE_FAILED: 409,
  INVALID_FULFILLMENT_STATUS: 400,
  ORDER_NOT_FOUND: 404,
  INVALID_PAYMENT_DETAILS: 422,
  PAYMENT_AMOUNT_INVALID: 422,
  SIMULATED_PAYMENT_FAILED: 409,
  INVALID_PAYMENT_TRANSITION: 409,
  PAYMENT_STATE_CONFLICT: 409,
  PAYMENT_VERSION_CONFLICT: 409,
  PAYMENT_ALLOCATION_FAILED: 409,
  PAYMENT_EVENT_IMMUTABLE: 409,
  PAYMENT_FINANCIALS_IMMUTABLE: 409,
  PAYMENT_ALLOCATION_IMMUTABLE: 409,
};

class ServiceError extends Error {
  constructor(code, message, status = 500, details = undefined) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function parseJsonObject(message) {
  if (typeof message !== 'string') return null;
  const start = message.indexOf('{');
  const end = message.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(message.slice(start, end + 1));
  } catch {
    return null;
  }
}

function fromRpcError(error, fallbackMessage = 'Đã xảy ra lỗi hệ thống.') {
  const parsed = parseJsonObject(error?.message);
  if (parsed?.code && parsed?.message) {
    return new ServiceError(
      parsed.code,
      parsed.message,
      RPC_STATUS_BY_CODE[parsed.code] || 409,
      parsed.details,
    );
  }

  // Raw database text is intentionally never returned to the caller.
  return new ServiceError('DATABASE_OPERATION_FAILED', fallbackMessage, 500);
}

module.exports = {
  ServiceError,
  fromRpcError,
  RPC_STATUS_BY_CODE,
};
