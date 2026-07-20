import Link from 'next/link';
import type { PublicSellerImpact } from '../../lib/impact';
import { ROUTES } from '../../constants/routes';

export function PublicSellerImpactCard({ impact }: { impact: PublicSellerImpact }) {
  return (
    <section data-testid="public-seller-impact" className="mb-10 border border-neutral-950 bg-white">
      <div className="grid sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Public circular ledger</p>
          <h2 className="mt-2 font-display text-xl font-black uppercase">Seller impact</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">Counts use người bán tự khai Product Journey classifications. No purchase history or customer information is public.</p>
          <Link href={ROUTES.SUSTAINABILITY} className="mt-4 inline-block font-mono text-[10px] font-bold uppercase tracking-wider underline underline-offset-4">View methodology v{impact.methodologyVersion}</Link>
        </div>
        <dl className="grid grid-cols-2 border-t border-neutral-200 sm:min-w-80 sm:border-l sm:border-t-0">
          <div className="border-r border-neutral-200 p-5">
            <dt className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">Active circular</dt>
            <dd className="mt-2 font-display text-3xl font-black tabular-nums">{impact.metrics.activeCircularListings}</dd>
          </div>
          <div className="p-5">
            <dt className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">Units sold</dt>
            <dd className="mt-2 font-display text-3xl font-black tabular-nums">{impact.metrics.completedCircularUnitsSold}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
