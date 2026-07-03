import { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { Container } from '../../../components/ui/Container';
import { Button } from '../../../components/ui/Button';
import { ROUTES } from '../../../constants/routes';

export const metadata: Metadata = {
  title: 'Order Confirmed',
  description: 'Your StyleHub order has been placed successfully.',
};

function SuccessContent({ searchParams }: { searchParams: { orderCode?: string } }) {
  const orderCode = searchParams.orderCode || 'UNKNOWN';

  return (
    <Container className="py-16 max-w-2xl text-center">
      <div className="border border-neutral-900 p-8 sm:p-12 bg-white text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <span className="text-5xl" aria-hidden="true">🎉</span>
        <h1 className="mt-6 font-display text-2xl font-black uppercase tracking-tight text-neutral-900">
          Order Received!
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-neutral-500">
          Order Number: <span className="font-bold text-neutral-900">{orderCode}</span>
        </p>
        
        <div className="my-8 border-t border-b border-neutral-100 py-6 text-left space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-600 font-mono uppercase tracking-wider w-32">Status:</span>
            <span className="inline-flex items-center border border-yellow-600 bg-yellow-50 px-2 py-0.5 font-mono text-[10px] uppercase font-bold text-yellow-800">
              Pending
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xs text-neutral-600 font-mono uppercase tracking-wider w-32 shrink-0">Payment Note:</span>
            <span className="text-sm text-neutral-900 leading-snug">
              Please prepare cash when the package arrives, or if you selected bank transfer, use your order code as the transfer content.
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-500 leading-relaxed mb-8 italic">
          *This is a Lab 6 demo order flow. No real online payment was processed.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={ROUTES.PROFILE} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full font-mono text-xs uppercase tracking-wider">
              View Profile
            </Button>
          </Link>
          <Link href={ROUTES.SHOP} className="w-full sm:w-auto">
            <Button size="lg" className="w-full font-mono text-xs uppercase tracking-wider">
              Return to Shop
            </Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}

export default function CheckoutSuccessPage({ searchParams }: { searchParams: { orderCode?: string } }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse bg-neutral-50" />}>
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
