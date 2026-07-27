'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { ROUTES } from '../../constants/routes';
import { Container } from '../ui/Container';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { formatVND } from '../../lib/format';
import { ListingImage } from '../marketplace/ListingImage';
import { createOrder, OrderApiError, previewOrder } from '../../lib/orders';
import { estimateShipping } from '../../lib/checkout';
import { vi } from '../../lib/i18n';

type QuoteItem = {
  productId: string;
  variantId: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  availableQuantity: number;
};

type Quote = {
  items: QuoteItem[];
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  total_amount: number;
  price_changes: Array<QuoteItem & { expectedUnitPrice: number; authoritativeUnitPrice: number }>;
  requires_review: boolean;
  coupon: { code: string; discount_type: string; discount_value: number } | null;
};

const quoteLineKey = (productId: string, variantId: string | null) => `${productId}:${variantId || ''}`;

export const CheckoutClient = () => {
  const router = useRouter();
  const { isAuthenticated, isHydrated: isAuthHydrated } = useAuth();
  const {
    cart, cartSubtotal, clearCart, removeFromCart, updateAuthoritativePrice,
    isHydrated: isCartHydrated,
  } = useCart();

  const [isPlacing, setIsPlacing] = useState(false);
  const submittingRef = useRef(false);
  const attemptRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<{ message: string; code?: string; details?: Record<string, unknown> } | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [cardBrand, setCardBrand] = useState('visa');
  const [lastFour, setLastFour] = useState('');
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const quoteItems = useMemo(() => cart.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    expectedUnitPrice: item.salePrice ?? item.price,
    quantity: item.quantity,
  })), [cart]);

  const refreshQuote = async (couponCode = appliedCouponCode, announceError = true) => {
    if (!isAuthenticated || quoteItems.length === 0) return null;
    setIsQuoting(true);
    if (announceError) setError(null);
    try {
      const response = await previewOrder({ items: quoteItems, ...(couponCode ? { couponCode } : {}) });
      setQuote(response.data);
      return response.data as Quote;
    } catch (caught) {
      const apiError = caught as OrderApiError;
      setQuote(null);
      if (couponCode && apiError.code.startsWith('COUPON')) {
        setAppliedCouponCode(null);
        setCouponError(apiError.message);
      } else if (announceError) {
        setError({ message: apiError.message, code: apiError.code, details: apiError.details });
      }
      return null;
    } finally {
      setIsQuoting(false);
    }
  };

  useEffect(() => {
    if (!isCartHydrated || !isAuthHydrated || !isAuthenticated || quoteItems.length === 0) return;
    let active = true;
    const loadQuote = async () => {
      setIsQuoting(true);
      try {
        const response = await previewOrder({ items: quoteItems, ...(appliedCouponCode ? { couponCode: appliedCouponCode } : {}) });
        if (active) {
          setQuote(response.data);
          setError(null);
        }
      } catch (caught) {
        const apiError = caught as OrderApiError;
        if (active) {
          setQuote(null);
          setError({ message: apiError.message, code: apiError.code, details: apiError.details });
        }
      } finally {
        if (active) setIsQuoting(false);
      }
    };
    void loadQuote();
    return () => { active = false; };
  }, [isCartHydrated, isAuthHydrated, isAuthenticated, quoteItems, appliedCouponCode]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const acceptPriceChanges = () => {
    quote?.price_changes.forEach((change) => {
      const cartItem = cart.find((item) => item.productId === change.productId && item.variantId === change.variantId);
      if (cartItem) updateAuthoritativePrice(cartItem.id, Number(change.authoritativeUnitPrice));
    });
    setError(null);
  };

  const removeProblemItem = () => {
    const productId = String(error?.details?.productId || '');
    const variantId = error?.details?.variantId ? String(error.details.variantId) : null;
    const cartItem = cart.find((item) => item.productId === productId && item.variantId === variantId);
    if (cartItem) removeFromCart(cartItem.id);
  };

  const handleApplyCoupon = async () => {
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;
    setCouponError(null);
    const nextQuote = await refreshQuote(code, false);
    if (nextQuote?.coupon) {
      setAppliedCouponCode(nextQuote.coupon.code);
      setCouponCodeInput(nextQuote.coupon.code);
    } else if (!nextQuote) {
      setCouponError('Không thể áp dụng mã giảm giá này.');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = vi.validation.fullNameMin;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = vi.validation.emailInvalid;
    if (!/^0[0-9]{9}$/.test(phone.trim())) nextErrors.phone = vi.validation.phoneInvalid;
    if (!province.trim()) nextErrors.province = vi.validation.provinceRequired;
    if (!district.trim()) nextErrors.district = vi.validation.districtRequired;
    if (!streetAddress.trim()) nextErrors.streetAddress = vi.validation.streetRequired;
    if (paymentMethod === 'simulated_card') {
      if (!['visa', 'mastercard', 'amex'].includes(cardBrand)) {
        nextErrors.cardBrand = vi.validation.simulatedCardBrandRequired;
      }
      if (!/^\d{4}$/.test(lastFour)) {
        nextErrors.lastFour = vi.validation.simulatedCardLastFourInvalid;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!isAuthenticated || !quote || quote.requires_review) {
      setError({ message: quote?.requires_review ? 'Giá sản phẩm đã thay đổi. Hãy xác nhận giá mới trước khi đặt hàng.' : 'Chưa thể xác nhận giỏ hàng. Vui lòng kiểm tra lại.' });
      return;
    }

    const payload = {
      customer: {
        name: name.trim(), email: email.trim(), phone: phone.trim(),
        address: `${streetAddress.trim()}, ${district.trim()}, ${province.trim()}`,
        city: province.trim(),
      },
      paymentMethod,
      ...(paymentMethod === 'simulated_card' ? {
        payment: { cardBrand, lastFour },
      } : {}),
      ...(appliedCouponCode ? { couponCode: appliedCouponCode } : {}),
      items: quoteItems,
    };
    const fingerprint = JSON.stringify(payload);
    const attempt = attemptRef.current?.fingerprint === fingerprint
      ? attemptRef.current
      : { fingerprint, key: crypto.randomUUID() };
    attemptRef.current = attempt;
    submittingRef.current = true;
    setIsPlacing(true);
    try {
      const response = await createOrder(payload, attempt.key);
      clearCart();
      router.replace(`${ROUTES.CHECKOUT_SUCCESS}?orderId=${encodeURIComponent(response.data.id)}`);
    } catch (caught) {
      const apiError = caught as OrderApiError;
      setError({ message: apiError.message, code: apiError.code, details: apiError.details });
      if (apiError.code !== 'NETWORK_ERROR') attemptRef.current = null;
      await refreshQuote(appliedCouponCode, false);
    } finally {
      submittingRef.current = false;
      setIsPlacing(false);
    }
  };

  if (!isCartHydrated || !isAuthHydrated) return <Container className="py-16 text-center"><p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 animate-pulse">{vi.common.loading}</p></Container>;
  if (!isAuthenticated) return (
    <Container className="py-16 sm:py-24 max-w-md"><div className="border border-neutral-200 bg-white p-6 sm:p-10 text-center">
      <span className="text-4xl mb-4 block" aria-hidden="true">🔒</span><h1 className="font-display text-2xl font-black uppercase tracking-tight">{vi.checkout.loginRequiredTitle}</h1>
      <p className="mt-2 mb-8 text-sm text-neutral-500">{vi.checkout.loginRequiredBody}</p>
      <div className="flex flex-col gap-3"><Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.CHECKOUT}`}><Button size="lg" className="w-full">{vi.checkout.goToLogin}</Button></Link><Link href={`${ROUTES.REGISTER}?redirect=${ROUTES.CHECKOUT}`}><Button variant="outline" size="lg" className="w-full">{vi.checkout.createAccount}</Button></Link></div>
    </div></Container>
  );
  if (cart.length === 0) return <Container className="py-16 text-center"><h2 className="font-display text-xl font-bold uppercase">{vi.cart.empty}</h2><Link href={ROUTES.SHOP}><Button className="mt-8">{vi.common.continueShopping}</Button></Link></Container>;

  const subtotal = quote?.subtotal ?? cartSubtotal;
  const shipping = quote?.shipping_fee ?? estimateShipping(cartSubtotal);
  const discount = quote?.discount_amount ?? 0;
  const total = quote?.total_amount ?? subtotal + shipping;
  const hasRemovableError = Boolean(error?.details?.productId);

  const inputClass = (field: string) => `mt-1.5 block w-full border px-3.5 py-2 text-sm focus:outline-none ${errors[field] ? 'border-red-500' : 'border-neutral-300 focus:border-neutral-900'}`;

  const submitLabel = isPlacing
    ? (paymentMethod === 'bank_transfer' ? 'Đang tạo hướng dẫn thanh toán...' : paymentMethod === 'simulated_card' ? 'Đang chuyển đến cổng thanh toán...' : 'Đang tạo đơn...')
    : isQuoting
    ? 'Đang kiểm tra giỏ hàng…'
    : paymentMethod === 'bank_transfer'
    ? 'Tạo đơn & nhận mã chuyển khoản'
    : paymentMethod === 'simulated_card'
    ? 'Tiếp tục thanh toán'
    : vi.checkout.placeOrder;

  return (
    <Container className="py-10 sm:py-16">
      <PageHeader eyebrow={vi.checkout.title} title={vi.checkout.title} lede="Giá và tồn kho được xác nhận trực tiếp trước khi tạo đơn." />
      {error && <div ref={errorRef} tabIndex={-1} role="alert" aria-live="assertive" data-testid="checkout-error-summary" className="mt-6 border border-red-300 bg-red-50 p-4 text-sm text-red-900 outline-none">
        <p className="font-semibold">{error.message}</p><div className="mt-3 flex flex-wrap gap-2">{hasRemovableError && <Button type="button" variant="outline" onClick={removeProblemItem}>Xóa sản phẩm lỗi</Button>}<Button type="button" variant="outline" onClick={() => refreshQuote()}>Kiểm tra lại</Button></div>
      </div>}
      {quote?.requires_review && <div role="status" className="mt-6 border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Giá giỏ hàng vừa thay đổi.</p>
        <ul className="mt-2 space-y-1">{quote.price_changes.map((change) => <li key={quoteLineKey(change.productId, change.variantId)}>{change.productName}: <s>{formatVND(Number(change.expectedUnitPrice))}</s> → {formatVND(Number(change.authoritativeUnitPrice))}</li>)}</ul>
        <Button type="button" className="mt-3" onClick={acceptPriceChanges}>Chấp nhận giá mới</Button>
      </div>}

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7"><form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
          <section className="border border-neutral-200 bg-white p-6 sm:p-8"><h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b pb-3 mb-6">1. {vi.checkout.formTitle}</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[
                ['name', vi.checkout.fullName, name, setName, 'text'], ['phone', vi.checkout.phone, phone, setPhone, 'tel'],
                ['email', vi.checkout.email, email, setEmail, 'email'], ['province', vi.checkout.province, province, setProvince, 'text'],
                ['district', vi.checkout.district, district, setDistrict, 'text'], ['streetAddress', vi.checkout.street, streetAddress, setStreetAddress, 'text'],
              ].map(([id, label, value, setter, type]) => <div key={id as string} className={id === 'email' ? 'sm:col-span-2' : ''}>
                <label htmlFor={id as string} className="block text-xs font-mono uppercase tracking-wider text-neutral-500">{label as string}</label>
                <input id={id as string} type={type as string} value={value as string} onChange={(e) => { (setter as (value: string) => void)(e.target.value); setErrors((old) => ({ ...old, [id as string]: '' })); }} aria-invalid={Boolean(errors[id as string])} aria-describedby={errors[id as string] ? `${id}-error` : undefined} className={inputClass(id as string)} />
                {errors[id as string] && <p id={`${id}-error`} className="mt-1 text-xs text-red-700">{errors[id as string]}</p>}
              </div>)}
            </div>
          </section>
          <section className="border border-neutral-200 bg-white p-6 sm:p-8"><h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b pb-3 mb-6">2. {vi.checkout.paymentMethod}</h2>
            <div className="space-y-3">{[
              ['cod', '📦', vi.checkout.cod, vi.checkout.codSubtitle, vi.checkout.codBadge],
              ['bank_transfer', '🏦', vi.checkout.bankTransfer, vi.checkout.bankTransferSubtitle, vi.checkout.bankTransferBadge],
              ['simulated_card', '💳', vi.checkout.simulatedCard, vi.checkout.simulatedCardCopy, vi.checkout.simulatedCardBadge],
            ].map(([value, icon, title, subtitle, badge]) => {
              const selected = paymentMethod === value;
              return (
                <label key={value} className={`flex gap-3 border p-4 cursor-pointer transition-colors ${selected ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-300 hover:border-neutral-400'}`}>
                  <input type="radio" name="payment" value={value} checked={selected} onChange={() => { setPaymentMethod(value); setErrors((old) => ({ ...old, cardBrand: '', lastFour: '' })); }} className="mt-1" />
                  <span aria-hidden="true" className="text-lg leading-none">{icon}</span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="block text-sm">{title}</strong>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-500 border border-neutral-300 px-1.5 py-0.5">{badge}</span>
                    </span>
                    <span className="block mt-0.5 text-xs text-neutral-500">{subtitle}</span>
                  </span>
                </label>
              );
            })}</div>
            {paymentMethod === 'bank_transfer' && <p className="mt-3 text-xs text-neutral-500">Mã tham chiếu, số tài khoản và hạn chuyển khoản sẽ hiển thị ngay sau khi đơn hàng được tạo.</p>}
            {paymentMethod === 'simulated_card' && <div data-testid="simulated-card-fields" className="mt-4 border border-amber-300 bg-amber-50 p-4">
              <p className="text-xs leading-relaxed text-amber-950">{vi.checkout.simulatedCardWarning}</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="simulated-card-brand" className="block text-xs font-mono uppercase tracking-wider text-neutral-600">{vi.checkout.simulatedCardBrand}</label>
                  <select id="simulated-card-brand" value={cardBrand} onChange={(event) => { setCardBrand(event.target.value); setErrors((old) => ({ ...old, cardBrand: '' })); }} aria-invalid={Boolean(errors.cardBrand)} aria-describedby={errors.cardBrand ? 'simulated-card-brand-error' : undefined} className={inputClass('cardBrand')}>
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">American Express</option>
                  </select>
                  {errors.cardBrand && <p id="simulated-card-brand-error" className="mt-1 text-xs text-red-700">{errors.cardBrand}</p>}
                </div>
                <div>
                  <label htmlFor="simulated-card-last-four" className="block text-xs font-mono uppercase tracking-wider text-neutral-600">{vi.checkout.simulatedCardLastFour}</label>
                  <input id="simulated-card-last-four" inputMode="numeric" maxLength={4} autoComplete="off" value={lastFour} onChange={(event) => { setLastFour(event.target.value.replace(/[^0-9]/g, '').slice(0, 4)); setErrors((old) => ({ ...old, lastFour: '' })); }} aria-invalid={Boolean(errors.lastFour)} aria-describedby={errors.lastFour ? 'simulated-card-last-four-error' : undefined} className={inputClass('lastFour')} />
                  {errors.lastFour && <p id="simulated-card-last-four-error" className="mt-1 text-xs text-red-700">{errors.lastFour}</p>}
                </div>
              </div>
            </div>}
          </section>
        </form></div>

        <aside className="lg:col-span-5"><div className="border border-neutral-200 bg-neutral-50 p-6 sm:p-8 lg:sticky lg:top-24">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b pb-3 mb-4">{vi.checkout.orderSummary} ({cart.length})</h2>
          <div className="divide-y divide-neutral-200 max-h-80 overflow-y-auto">{cart.map((item) => <div key={item.id} className="flex gap-3 py-4"><div className="h-14 w-14 shrink-0 border bg-white"><ListingImage src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.name}</p><p className="mt-1 font-mono text-[10px] text-neutral-500">SL {item.quantity} · Cỡ {item.size}</p></div><p className="font-mono text-xs font-bold">{formatVND((item.salePrice ?? item.price) * item.quantity)}</p></div>)}</div>
          <dl className="mt-6 space-y-3 border-t pt-5 text-xs"><div className="flex justify-between"><dt>{vi.cart.subtotal}</dt><dd className="font-mono">{formatVND(subtotal)}</dd></div><div className="flex justify-between"><dt>{vi.cart.shippingFee}</dt><dd className="font-mono">{shipping === 0 ? 'Miễn phí' : formatVND(shipping)}</dd></div>{discount > 0 && <div className="flex justify-between text-green-800"><dt>{vi.coupon.discount}</dt><dd className="font-mono">− {formatVND(discount)}</dd></div>}<div className="flex justify-between border-t pt-4 text-base font-bold"><dt>{vi.cart.total}</dt><dd className="font-mono">{formatVND(total)}</dd></div></dl>
          <div className="mt-6 border-t pt-5"><label htmlFor="coupon" className="text-xs font-semibold">{vi.coupon.title}</label>{appliedCouponCode ? <div className="mt-2 flex items-center justify-between border border-green-300 bg-green-50 p-3"><span className="font-mono text-xs font-bold text-green-900">{appliedCouponCode}</span><button type="button" className="text-xs underline" onClick={() => { setAppliedCouponCode(null); setCouponCodeInput(''); }}>Gỡ</button></div> : <div className="mt-2 flex gap-2"><input id="coupon" value={couponCodeInput} onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())} className="min-w-0 flex-1 border border-neutral-300 px-3 py-2 text-xs font-mono" /><Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={isQuoting}>Áp dụng</Button></div>}{couponError && <p role="alert" className="mt-2 text-xs text-red-700">{couponError}</p>}</div>
          <Button form="checkout-form" type="submit" size="lg" className="mt-7 w-full" disabled={isPlacing || isQuoting || !quote || quote.requires_review}>{submitLabel}</Button>
          <p aria-live="polite" className="mt-3 text-center text-[11px] text-neutral-500">Chỉ trừ tồn kho khi đơn hàng được tạo thành công.</p>
        </div></aside>
      </div>
    </Container>
  );
};
