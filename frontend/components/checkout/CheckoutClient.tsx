'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { ROUTES } from '../../constants/routes';
import { Container } from '../ui/Container';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { formatVND } from '../../lib/format';
import { ListingImage } from '../marketplace/ListingImage';
import { createOrder, validateCoupon } from '../../lib/orders';
import { vi } from '../../lib/i18n';

export const CheckoutClient = () => {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated: isAuthHydrated } = useAuth();
  const { cart, cartSubtotal, clearCart, isHydrated: isCartHydrated } = useCart();
  
  const [isPlacing, setIsPlacing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_value: number; discount_type: string } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [verifiedTotal, setVerifiedTotal] = useState<number | null>(null);
  const [verifiedShipping, setVerifiedShipping] = useState<number | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const defaultShippingCost = cartSubtotal > 0 ? 30000 : 0;
  const displayShipping = verifiedShipping !== null ? verifiedShipping : defaultShippingCost;
  const grandTotal = verifiedTotal !== null ? verifiedTotal : cartSubtotal + displayShipping;

  const handleApplyCoupon = async () => {
    if (!couponCodeInput.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    try {
      const payload = {
        code: couponCodeInput.trim(),
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          unitPrice: item.salePrice ?? item.price,
          quantity: item.quantity,
        })),
      };
      const res = await validateCoupon(payload);
      if (res.success && res.data) {
        setAppliedCoupon(res.data.coupon);
        setDiscountAmount(res.data.totals.discount_amount);
        setVerifiedTotal(res.data.totals.total_amount);
        setVerifiedShipping(res.data.totals.shipping_fee);
      } else {
        setCouponError(res.error?.message || vi.coupon.invalid);
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setVerifiedTotal(null);
        setVerifiedShipping(null);
      }
    } catch (err) {
      const e = err as Error;
      setCouponError(e?.message || vi.common.error);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCodeInput('');
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setVerifiedTotal(null);
    setVerifiedShipping(null);
    setCouponError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setErrors({});
    
    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!name || name.trim().length < 2) newErrors.name = vi.validation.fullNameMin;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = vi.validation.emailInvalid;
    if (!phone || !/^0[0-9]{9}$/.test(phone.trim())) newErrors.phone = vi.validation.phoneInvalid;
    if (!province || !province.trim()) newErrors.province = vi.validation.provinceRequired;
    if (!district || !district.trim()) newErrors.district = vi.validation.districtRequired;
    if (!streetAddress || !streetAddress.trim()) newErrors.streetAddress = vi.validation.streetRequired;
    if (!paymentMethod) newErrors.paymentMethod = vi.validation.paymentMethodRequired;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsPlacing(true);

    if (!isAuthenticated) {
      setErrorMsg(vi.checkout.loginRequiredBody);
      setIsPlacing(false);
      return;
    }

    try {
      const fullShippingAddress = `${streetAddress.trim()}, ${district.trim()}, ${province.trim()}`;
      const payload = {
        customer: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: fullShippingAddress,
          city: province.trim(),
        },
        paymentMethod,
        couponCode: appliedCoupon?.code,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.name,
          productSlug: item.slug,
          imageUrl: item.imageUrl,
          sku: item.slug, // fallback to slug if sku is absent, map properly
          size: item.size,
          condition: item.condition,
          unitPrice: item.salePrice ?? item.price,
          quantity: item.quantity,
        })),
      };

      const res = await createOrder(payload);

      if (res.success && res.data?.order_code) {
        clearCart();
        router.push(`${ROUTES.CHECKOUT_SUCCESS}?orderCode=${res.data.order_code}`);
      } else {
        setErrorMsg(res.error?.message || vi.common.error);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const e = err as Error;
      setErrorMsg(e?.message || vi.common.error);
    } finally {
      setIsPlacing(false);
    }
  };

  if (!isCartHydrated || !isAuthHydrated) {
    return (
      <Container className="py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 animate-pulse">
          {vi.common.loading}
        </p>
      </Container>
    );
  }

  // If user is a guest, prompt them to login
  if (!isAuthenticated) {
    return (
      <Container className="py-16 sm:py-24 max-w-md">
        <div className="border border-neutral-200 bg-white p-6 sm:p-10 text-center">
          <span className="text-4xl mb-4 block" aria-hidden="true">🔒</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
            {vi.checkout.loginRequiredTitle}
          </h1>
          <p className="text-sm text-neutral-500 mb-8">
            {vi.checkout.loginRequiredBody}
          </p>
          <div className="flex flex-col gap-3">
            <Link href={`${ROUTES.LOGIN}?redirect=${ROUTES.CHECKOUT}`}>
              <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                {vi.checkout.goToLogin}
              </Button>
            </Link>
            <Link href={`${ROUTES.REGISTER}?redirect=${ROUTES.CHECKOUT}`}>
              <Button variant="outline" size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
                {vi.checkout.createAccount}
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    );
  }

  // If cart is empty, show redirect link
  if (cart.length === 0) {
    return (
      <Container className="py-16 text-center max-w-md">
        <h2 className="font-display text-lg font-bold uppercase tracking-tight text-neutral-900">
          {vi.cart.empty}
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          Vui lòng thêm sản phẩm trước khi thanh toán.
        </p>
        <div className="mt-8">
          <Link href={ROUTES.SHOP}>
            <Button className="font-mono text-xs uppercase tracking-wider">{vi.common.continueShopping}</Button>
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10 sm:py-16">
      <PageHeader
        eyebrow={vi.checkout.title}
        title={vi.checkout.title}
        lede=""
      />

      {errorMsg && (
        <div className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800 font-medium">
          {errorMsg}
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left: Shipping Form */}
        <div className="lg:col-span-7">
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="border border-[var(--border)] p-6 sm:p-8 bg-[var(--background)] rounded-[var(--radius-card)]">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-6">
                1. {vi.checkout.formTitle}
              </h2>

              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="name" className="block text-xs font-mono uppercase tracking-wider text-neutral-500">
                    {vi.checkout.fullName}
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
                    className={`mt-1.5 block w-full border px-3.5 py-2 text-sm text-neutral-900 focus:outline-none ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-neutral-300 focus:border-neutral-900'}`}
                  />
                  {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>}
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="phone" className="block text-xs font-mono uppercase tracking-wider text-neutral-500">
                    {vi.checkout.phone}
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setErrors(prev => ({ ...prev, phone: '' })); }}
                    className={`mt-1.5 block w-full border px-3.5 py-2 text-sm text-neutral-900 focus:outline-none ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-neutral-300 focus:border-neutral-900'}`}
                  />
                  {errors.phone && <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>}
                  {!errors.phone && <p className="mt-1.5 text-xs text-neutral-400">{vi.checkout.phoneHint}</p>}
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="email" className="block text-xs font-mono uppercase tracking-wider text-neutral-500">
                    {vi.checkout.email}
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }}
                    className={`mt-1.5 block w-full border px-3.5 py-2 text-sm text-neutral-900 focus:outline-none ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-neutral-300 focus:border-neutral-900'}`}
                  />
                  {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="province" className="block text-xs font-mono uppercase tracking-wider text-neutral-500">
                    {vi.checkout.province}
                  </label>
                  <input
                    type="text"
                    id="province"
                    value={province}
                    onChange={(e) => { setProvince(e.target.value); setErrors(prev => ({ ...prev, province: '' })); }}
                    className={`mt-1.5 block w-full border px-3.5 py-2 text-sm text-neutral-900 focus:outline-none ${errors.province ? 'border-red-500 focus:border-red-500' : 'border-neutral-300 focus:border-neutral-900'}`}
                  />
                  {errors.province && <p className="mt-1.5 text-xs text-red-600">{errors.province}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="district" className="block text-xs font-mono uppercase tracking-wider text-neutral-500">
                    {vi.checkout.district}
                  </label>
                  <input
                    type="text"
                    id="district"
                    value={district}
                    onChange={(e) => { setDistrict(e.target.value); setErrors(prev => ({ ...prev, district: '' })); }}
                    className={`mt-1.5 block w-full border px-3.5 py-2 text-sm text-neutral-900 focus:outline-none ${errors.district ? 'border-red-500 focus:border-red-500' : 'border-neutral-300 focus:border-neutral-900'}`}
                  />
                  {errors.district && <p className="mt-1.5 text-xs text-red-600">{errors.district}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="streetAddress" className="block text-xs font-mono uppercase tracking-wider text-neutral-500">
                    {vi.checkout.street}
                  </label>
                  <input
                    type="text"
                    id="streetAddress"
                    value={streetAddress}
                    onChange={(e) => { setStreetAddress(e.target.value); setErrors(prev => ({ ...prev, streetAddress: '' })); }}
                    className={`mt-1.5 block w-full border px-3.5 py-2 text-sm text-neutral-900 focus:outline-none ${errors.streetAddress ? 'border-red-500 focus:border-red-500' : 'border-neutral-300 focus:border-neutral-900'}`}
                  />
                  {errors.streetAddress && <p className="mt-1.5 text-xs text-red-600">{errors.streetAddress}</p>}
                </div>
              </div>
            </div>

            <div className="border border-neutral-200 p-6 sm:p-8 bg-white">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-100 pb-3 mb-6">
                2. {vi.checkout.paymentMethod}
              </h2>

              <div className="space-y-4">
                <label className="flex items-center gap-3 border border-neutral-300 p-4 cursor-pointer hover:bg-neutral-50">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => { setPaymentMethod('cod'); setErrors(prev => ({ ...prev, paymentMethod: '' })); }}
                    className="h-4 w-4 text-neutral-950 focus:ring-neutral-950"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{vi.checkout.cod}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Thanh toán bằng tiền mặt khi nhận hàng.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 border border-neutral-300 p-4 cursor-pointer hover:bg-neutral-50">
                  <input
                    type="radio"
                    name="payment"
                    value="bank_transfer"
                    checked={paymentMethod === 'bank_transfer'}
                    onChange={() => { setPaymentMethod('bank_transfer'); setErrors(prev => ({ ...prev, paymentMethod: '' })); }}
                    className="h-4 w-4 text-neutral-950 focus:ring-neutral-950"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{vi.checkout.bankTransfer}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">Mô phỏng thanh toán chuyển khoản.</p>
                  </div>
                </label>
                
                {errors.paymentMethod && <p className="mt-2 text-xs text-red-600">{errors.paymentMethod}</p>}

                {paymentMethod === 'bank_transfer' && (
                  <div className="mt-3 ml-7 bg-neutral-100 p-3 border border-neutral-200 text-xs">
                    <p className="font-mono font-bold text-neutral-800 mb-1 uppercase tracking-wider">StyleHub Demo Bank</p>
                    <p>Tên tài khoản: STYLEHUB DEMO</p>
                    <p>Số tài khoản: 0000 1234 5678</p>
                    <p className="mt-1 text-neutral-500 italic">Nội dung chuyển khoản: Mã đơn hàng (sẽ hiển thị sau khi đặt).</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Right: Items Review */}
        <div className="lg:col-span-5">
          <div className="border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 border-b border-neutral-200 pb-3 mb-6">
              {vi.checkout.orderSummary} ({cart.length})
            </h2>

            <div className="divide-y divide-neutral-200 max-h-96 overflow-y-auto pr-2">
              {cart.map((item) => {
                const itemPrice = item.salePrice ?? item.price;
                return (
                  <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="relative h-14 w-14 flex-shrink-0 border border-neutral-200 bg-white">
                      <ListingImage src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-neutral-900 truncate">{item.name}</h4>
                      <p className="font-mono text-[10px] text-neutral-500 mt-0.5">
                        Qty {item.quantity} · Size {item.size}
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Người bán: {item.sellerHandle}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-xs font-bold text-neutral-900">
                        {formatVND(itemPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <dl className="mt-6 border-t border-neutral-200 pt-6 space-y-4 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">{vi.cart.subtotal}</span>
                <span className="font-mono text-neutral-900">{formatVND(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{vi.cart.shippingFee}</span>
                <span className="font-mono text-neutral-900">
                  {displayShipping === 0 ? 'Miễn phí' : formatVND(displayShipping)}
                </span>
              </div>

              {/* Coupon Section */}
              <div className="border-t border-neutral-200 pt-4 pb-2">
                <p className="font-semibold text-neutral-900 mb-3">{vi.coupon.title}</p>
                {!appliedCoupon ? (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        placeholder={vi.coupon.placeholder}
                        className="flex-1 border border-neutral-300 px-3 py-2 text-xs uppercase font-mono focus:outline-none focus:border-neutral-900"
                        disabled={isApplyingCoupon}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleApplyCoupon}
                        disabled={isApplyingCoupon || !couponCodeInput.trim()}
                        className="text-[10px] px-3 py-2"
                      >
                        {isApplyingCoupon ? vi.common.loading : vi.coupon.apply}
                      </Button>
                    </div>
                    {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}
                  </div>
                ) : (
                  <div className="flex justify-between items-center bg-green-50 border border-green-200 p-3">
                    <div>
                      <p className="font-mono font-bold text-green-800 text-xs">{appliedCoupon.code}</p>
                      <p className="text-[10px] text-green-700">{vi.coupon.applied}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[10px] text-red-600 hover:underline focus:outline-none"
                    >
                      {vi.coupon.remove}
                    </button>
                  </div>
                )}
              </div>

              {appliedCoupon && discountAmount > 0 && (
                <div className="flex justify-between text-green-700 font-medium">
                  <span>{vi.coupon.discount}</span>
                  <span className="font-mono">- {formatVND(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-neutral-200 pt-4 text-sm font-bold text-neutral-900">
                <span>{vi.cart.total}</span>
                <span className="font-mono text-base">{formatVND(grandTotal)}</span>
              </div>
            </dl>

            <div className="mt-8">
              <Button
                form="checkout-form"
                type="submit"
                size="lg"
                className="w-full py-4 text-sm font-mono uppercase tracking-wider font-bold"
                disabled={isPlacing || cart.length === 0}
              >
                {isPlacing ? vi.checkout.processingOrder : vi.checkout.placeOrder}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};
