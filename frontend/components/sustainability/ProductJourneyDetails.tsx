import type { ProductSustainability } from '../../lib/productJourney';
import { getLifecycleOption } from '../../lib/productJourney';
import { LifecycleBadge } from './LifecycleBadge';

interface ProductJourneyDetailsProps {
  journey?: ProductSustainability | null;
}

export function ProductJourneyDetails({ journey }: ProductJourneyDetailsProps) {
  const lifecycle = journey?.lifecycle_type || 'not_specified';
  const option = getLifecycleOption(lifecycle);
  const rows = [
    journey?.material ? { label: 'Chất liệu', value: journey.material } : null,
    journey?.repair_history ? { label: 'Lịch sử sửa chữa', value: journey.repair_history } : null,
    journey?.upcycle_details ? { label: 'Chi tiết tái thiết kế', value: journey.upcycle_details } : null,
    journey?.product_story ? { label: 'Câu chuyện sản phẩm', value: journey.product_story } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <section data-testid="product-journey" aria-labelledby="product-journey-title" className="mt-6 border border-neutral-200">
      <div className="border-b border-neutral-200 px-4 py-3 sm:px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">Thông tin vòng đời</p>
        <h2 id="product-journey-title" className="mt-1 font-display text-xl font-black uppercase tracking-tight text-neutral-900">
          Product Journey
        </h2>
        <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-neutral-500">
          Thông tin do người bán cung cấp để mô tả hành trình của sản phẩm; không phải chứng nhận của StyleHub.
        </p>
      </div>

      <dl>
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <dt className="text-sm text-neutral-500">Vòng đời</dt>
          <dd>
            <LifecycleBadge lifecycle={lifecycle} showNotSpecified testId="product-journey-lifecycle" />
          </dd>
        </div>
        <div className="flex flex-col gap-1 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5">
          <dt className="text-sm text-neutral-500">Nguồn thông tin</dt>
          <dd className="text-sm font-medium text-neutral-900">{journey?.claim_source === 'seller_declared' ? 'Người bán tự khai' : 'Chưa cung cấp'}</dd>
        </div>
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1 border-t border-neutral-100 px-4 py-3 sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6 sm:px-5">
            <dt className="text-sm text-neutral-500">{row.label}</dt>
            <dd className="min-w-0 whitespace-pre-line break-words text-sm leading-relaxed text-neutral-900">{row.value}</dd>
          </div>
        ))}
        <div className="flex flex-col gap-1 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5">
          <dt className="text-sm text-neutral-500">Dự định tái sử dụng bao bì</dt>
          <dd className="text-sm font-medium text-neutral-900">
            {journey?.claim_source ? (journey.reuse_packaging ? 'Có' : 'Không') : 'Chưa cung cấp'}
          </dd>
        </div>
      </dl>

      {option?.value === 'not_specified' && (
        <p className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 text-xs leading-relaxed text-neutral-500 sm:px-5">
          Người bán chưa cung cấp thêm thông tin về hành trình sản phẩm này.
        </p>
      )}
    </section>
  );
}
