export const FREE_SHIPPING_THRESHOLD = 500_000;
export const STANDARD_SHIPPING_FEE = 30_000;

export function estimateShipping(subtotal: number) {
  return subtotal > FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : STANDARD_SHIPPING_FEE;
}
