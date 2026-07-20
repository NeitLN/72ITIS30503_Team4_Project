'use client';

import { useEffect, useState } from 'react';
import { getPlatformImpact, PlatformImpact } from '../../lib/impact';
import { ImpactLedger } from './ImpactLedger';

export function PlatformImpactPanel({ home = false }: { home?: boolean }) {
  const [impact, setImpact] = useState<PlatformImpact | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getPlatformImpact()
      .then((data) => { if (active) setImpact(data); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  if (failed) {
    return (
      <div data-testid="platform-impact-error" role="status" className="border border-neutral-300 bg-white p-6">
        <p className="font-display text-lg font-bold uppercase">Impact ledger is temporarily unavailable.</p>
        <p className="mt-2 text-sm text-neutral-600">Shopping remains available. No impact number is shown unless it can be calculated from current records.</p>
      </div>
    );
  }

  if (!impact) {
    return <div aria-label="Đang tải dữ liệu tác động" className="h-64 animate-pulse border border-neutral-300 bg-neutral-100" />;
  }

  const isZero = impact.metrics.activeUserListings === 0 && impact.metrics.completedCircularUnits === 0;
  return (
    <div data-testid={home ? 'home-impact' : 'sustainability-impact'}>
      {isZero ? (
        <div data-testid="platform-impact-zero" className="mb-4 border border-dashed border-neutral-400 bg-white p-5 text-sm text-neutral-600">
          Chưa có hoạt động tuần hoàn đủ điều kiện. Sổ tác động bắt đầu từ dữ liệu thực, không dùng số minh họa.
        </div>
      ) : null}
      <ImpactLedger
        eyebrow={home ? 'Live marketplace ledger' : 'Current platform totals'}
        title={home ? 'Circular Impact' : 'What the marketplace records'}
        description="Direct counts from active community listings and completed order-item snapshots. New items improve journey coverage but are not counted as circular."
        metrics={[
          { label: 'Active circular listings', value: impact.metrics.activeCircularListings, testId: 'metric-active-circular' },
          { label: 'Completed circular units', value: impact.metrics.completedCircularUnits, testId: 'metric-completed-circular' },
          { label: 'Journey coverage', value: `${impact.metrics.journeyCoveragePercent}%`, testId: 'metric-coverage' },
        ]}
        generatedAt={impact.generatedAt}
        methodologyVersion={impact.methodologyVersion}
      />
    </div>
  );
}
