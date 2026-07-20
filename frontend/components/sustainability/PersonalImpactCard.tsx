import Link from 'next/link';
import type { ProfileImpact } from '../../lib/impact';
import { ROUTES } from '../../constants/routes';

export function PersonalImpactCard({ impact, dashboard = false }: { impact: ProfileImpact; dashboard?: boolean }) {
  const isZero = impact.metrics.activeCircularListings === 0
    && impact.metrics.circularUnitsSold === 0
    && impact.metrics.circularUnitsPurchased === 0;

  return (
    <section data-testid={dashboard ? 'dashboard-impact' : 'profile-impact'} className="mt-8 border border-neutral-950 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Private circular ledger</p>
          <h2 className="mt-1 font-display text-xl font-black uppercase tracking-tight">Your circular impact</h2>
        </div>
        <Link href={ROUTES.SUSTAINABILITY} className="w-fit font-mono text-[10px] font-bold uppercase tracking-wider underline underline-offset-4">Methodology v{impact.methodologyVersion}</Link>
      </div>
      {isZero ? (
        <div data-testid="profile-impact-zero" className="border-b border-dashed border-neutral-300 p-5 text-sm text-neutral-600">
          Chưa có hoạt động tuần hoàn đủ điều kiện. Your ledger will grow from active circular listings and completed circular purchases or sales.
        </div>
      ) : null}
      <dl className="grid grid-cols-1 divide-y divide-neutral-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Journey coverage</dt>
          <dd className="mt-2 font-display text-3xl font-black tabular-nums">{impact.metrics.journeyCoveragePercent}%</dd>
        </div>
        <div className="p-5">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Circular units sold</dt>
          <dd className="mt-2 font-display text-3xl font-black tabular-nums">{impact.metrics.circularUnitsSold}</dd>
          <p className="mt-1 text-xs text-neutral-500">Đã bán · completed only</p>
        </div>
        <div className="p-5">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">Circular units purchased</dt>
          <dd className="mt-2 font-display text-3xl font-black tabular-nums">{impact.metrics.circularUnitsPurchased}</dd>
          <p className="mt-1 text-xs text-neutral-500">Đã mua · completed only</p>
        </div>
      </dl>
      <p className="border-t border-neutral-200 bg-neutral-50 px-5 py-3 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
        Seller-declared journeys · calculated {new Date(impact.generatedAt).toLocaleString('vi-VN')}
      </p>
    </section>
  );
}
