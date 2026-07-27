import Link from 'next/link';
import type { ProfileImpact } from '../../lib/impact';
import { ROUTES } from '../../constants/routes';
import { Button } from '../ui/Button';

export function PersonalImpactCard({ impact, dashboard = false }: { impact: ProfileImpact; dashboard?: boolean }) {
  const isZero = impact.metrics.activeCircularListings === 0
    && impact.metrics.circularUnitsSold === 0
    && impact.metrics.circularUnitsPurchased === 0;

  if (isZero) {
    return (
      <section data-testid={dashboard ? 'dashboard-impact' : 'profile-impact'} className="mt-8 border border-neutral-950 bg-white p-6 sm:p-8">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          <h2 className="font-display text-xl font-black uppercase tracking-tight text-neutral-900 mb-3">
            Bắt đầu hành trình thời trang tuần hoàn
          </h2>
          <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
            Các chỉ số sẽ được cập nhật khi những giao dịch mua sắm đủ điều kiện của bạn được hoàn tất.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <Link href={ROUTES.SHOP}>
              <Button className="w-full font-mono text-xs uppercase tracking-wider">Khám phá sản phẩm</Button>
            </Link>
            <Link href={ROUTES.ORDERS}>
              <Button variant="outline" className="w-full font-mono text-xs uppercase tracking-wider">Xem đơn hàng</Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-testid={dashboard ? 'dashboard-impact' : 'profile-impact'} className="mt-8 border border-neutral-950 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-200 p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">THỐNG KÊ TUẦN HOÀN CÁ NHÂN</p>
          <h2 className="mt-1 font-display text-xl font-black uppercase tracking-tight">ĐÓNG GÓP TUẦN HOÀN CỦA BẠN</h2>
        </div>
        <Link href={ROUTES.SUSTAINABILITY} className="w-fit font-mono text-[10px] font-bold uppercase tracking-wider underline underline-offset-4">CÁCH TÍNH V{impact.methodologyVersion}</Link>
      </div>
      <dl className="grid grid-cols-1 divide-y divide-neutral-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">TỶ LỆ GHI NHẬN HÀNH TRÌNH</dt>
          <dd className="mt-2 font-display text-3xl font-black tabular-nums">{impact.metrics.journeyCoveragePercent}%</dd>
        </div>
        <div className="p-5">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">SẢN PHẨM TUẦN HOÀN ĐÃ BÁN</dt>
          <dd className="mt-2 font-display text-3xl font-black tabular-nums">{impact.metrics.circularUnitsSold}</dd>
          <p className="mt-1 text-xs text-neutral-500">Đã bán · chỉ tính đơn hoàn tất</p>
        </div>
        <div className="p-5">
          <dt className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">SẢN PHẨM TUẦN HOÀN ĐÃ MUA</dt>
          <dd className="mt-2 font-display text-3xl font-black tabular-nums">{impact.metrics.circularUnitsPurchased}</dd>
          <p className="mt-1 text-xs text-neutral-500">Đã mua · chỉ tính đơn hoàn tất</p>
        </div>
      </dl>
      <p className="border-t border-neutral-200 bg-neutral-50 px-5 py-3 font-mono text-[9px] uppercase tracking-wider text-neutral-500">
        HÀNH TRÌNH DO NGƯỜI BÁN KHAI BÁO · CẬP NHẬT LÚC {new Date(impact.generatedAt).toLocaleString('vi-VN')}
      </p>
    </section>
  );
}
