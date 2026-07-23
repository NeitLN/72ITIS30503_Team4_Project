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
        eyebrow={home ? 'SỐ LIỆU TỪ SÀN MUA BÁN' : 'SỐ LIỆU HIỆN TẠI'}
        title={home ? 'GIÁ TRỊ TUẦN HOÀN' : 'NHỮNG GÌ STYLEHUB GHI NHẬN'}
        description="Số liệu được tổng hợp từ các tin đăng đang hoạt động và những sản phẩm đã giao dịch thành công. Sản phẩm mới không được tính vào số liệu thời trang tuần hoàn."
        metrics={[
          { label: 'TIN ĐĂNG ĐỒ ĐÃ QUA SỬ DỤNG', value: impact.metrics.activeCircularListings, testId: 'metric-active-circular' },
          { label: 'SẢN PHẨM ĐÃ GIAO DỊCH', value: impact.metrics.completedCircularUnits, testId: 'metric-completed-circular' },
          { label: 'TỶ LỆ THEO DÕI HÀNH TRÌNH', value: `${impact.metrics.journeyCoveragePercent}%`, testId: 'metric-coverage' },
        ]}
        generatedAt={impact.generatedAt}
        methodologyVersion={impact.methodologyVersion}
      />
    </div>
  );
}
