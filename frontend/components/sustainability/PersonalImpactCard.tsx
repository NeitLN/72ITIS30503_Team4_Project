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
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">THỐNG KÊ TUẦN HOÀN CÁ NHÂN</p>
          <h2 className="mt-1 font-display text-xl font-black uppercase tracking-tight">ĐÓNG GÓP TUẦN HOÀN CỦA BẠN</h2>
        </div>
        <Link href={ROUTES.SUSTAINABILITY} className="w-fit font-mono text-[10px] font-bold uppercase tracking-wider underline underline-offset-4">CÁCH TÍNH V{impact.methodologyVersion}</Link>
      </div>
      {isZero ? (
        <div data-testid="profile-impact-zero" className="border-b border-dashed border-neutral-300 p-5 text-sm text-neutral-600">
          Chưa có hoạt động tuần hoàn đủ điều kiện. Số liệu của bạn sẽ được cập nhật khi có sản phẩm tuần hoàn đang đăng bán hoặc giao dịch mua bán đã hoàn tất.
        </div>
      ) : null}
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
