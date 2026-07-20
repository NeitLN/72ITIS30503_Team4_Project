import Link from 'next/link';
import { ROUTES } from '../../constants/routes';

export interface LedgerMetric {
  label: string;
  value: number | string;
  testId?: string;
}

interface ImpactLedgerProps {
  eyebrow?: string;
  title: string;
  description: string;
  metrics: LedgerMetric[];
  generatedAt?: string;
  methodologyVersion?: string;
  className?: string;
}

export function ImpactLedger({
  eyebrow = 'Circular impact ledger', title, description, metrics,
  generatedAt, methodologyVersion = '1.0', className = '',
}: ImpactLedgerProps) {
  return (
    <section className={`border border-neutral-300 bg-white ${className}`}>
      <div className="grid gap-6 border-b border-neutral-200 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">{eyebrow}</p>
          <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-tight text-neutral-950 sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">{description}</p>
        </div>
        <Link href={ROUTES.SUSTAINABILITY} className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.14em] underline underline-offset-4 focus:outline-2 focus:outline-offset-4">
          Phương pháp tính
        </Link>
      </div>
      <dl className="grid grid-cols-1 divide-y divide-neutral-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 p-5 sm:p-6">
            <dt className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">{metric.label}</dt>
            <dd data-testid={metric.testId} className="mt-2 font-display text-4xl font-black tabular-nums tracking-tight text-neutral-950">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-1 border-t border-neutral-200 bg-neutral-50 px-5 py-3 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <span>Methodology v{methodologyVersion} · Người bán tự khai</span>
        {generatedAt ? <time dateTime={generatedAt}>Tính lúc {new Date(generatedAt).toLocaleString('vi-VN')}</time> : null}
      </div>
    </section>
  );
}
