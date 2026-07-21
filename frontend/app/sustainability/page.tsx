import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '../../components/ui/Container';
import { PlatformImpactPanel } from '../../components/sustainability/PlatformImpactPanel';
import { ROUTES } from '../../constants/routes';
import { SITE_URL } from '../../lib/seo';

export const metadata: Metadata = {
  title: 'Circular Impact & Sustainability',
  description: 'How StyleHub counts circular listings and completed circular units with transparent, seller-declared Product Journey data.',
  alternates: { canonical: `${SITE_URL}/sustainability` },
};

const journeys = [
  ['new', 'New', 'A specified journey, but not a circular classification.'],
  ['deadstock', 'Deadstock', 'Unused inventory returned to circulation.'],
  ['pre_loved', 'Pre-loved', 'A piece offered for another ownership cycle.'],
  ['repaired', 'Repaired', 'A piece whose seller records meaningful repair history.'],
  ['upcycled', 'Upcycled', 'A piece the seller describes as materially redesigned.'],
  ['not_specified', 'Not specified', 'No journey claim; excluded from the coverage numerator.'],
] as const;

export default function SustainabilityPage() {
  return (
    <div data-testid="sustainability-page" className="bg-neutral-50 pb-20">
      <header className="border-b border-neutral-800 bg-neutral-950 py-14 text-white sm:py-20">
        <Container>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-400">StyleHub circularity · methodology v1.0</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-black uppercase leading-[0.93] tracking-tight sm:text-6xl lg:text-7xl">Wear Longer. Waste Less.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg">
            We make the marketplace&apos;s circular activity legible with direct counts—never invented equivalencies or environmental scores.
          </p>
        </Container>
      </header>

      <Container className="py-10 sm:py-14">
        <PlatformImpactPanel />

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.75fr)]">
          <section aria-labelledby="journey-heading">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">Classification ledger</p>
            <h2 id="journey-heading" className="mt-2 font-display text-3xl font-black uppercase tracking-tight">Product Journey</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-600">
              Product Journey information is <strong>người bán tự khai</strong> (seller declared). StyleHub does not independently certify these claims. Each definition links to the live marketplace filter.
            </p>
            <div className="mt-7 grid gap-px border border-neutral-300 bg-neutral-300 sm:grid-cols-2">
              {journeys.map(([value, label, description], index) => (
                <Link
                  key={value}
                  href={`/shop?lifecycle=${value}`}
                  className="group min-w-0 bg-white p-5 outline-none transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-950"
                >
                  <span className="font-mono text-[10px] text-neutral-400">0{index + 1}</span>
                  <h3 className="mt-4 font-display text-lg font-black uppercase tracking-tight group-hover:underline">{label}</h3>
                  <p className="mt-2 text-sm leading-5 text-neutral-600">{description}</p>
                </Link>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="border border-neutral-300 bg-white p-6">
              <h2 className="font-display text-xl font-black uppercase">What we do not claim</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                StyleHub không cung cấp ước tính carbon, CO2, lượng nước, chất thải tránh được hoặc điểm môi trường. We publish only counts supported by marketplace records.
              </p>
            </section>
            <section id="demo-disclosure" className="border border-amber-300 bg-amber-50 p-6">
              <h2 className="font-display text-xl font-black uppercase">Demo environment</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-700">
                StyleHub hiện là <strong>môi trường trình diễn học phần</strong> (university course demonstration environment). Một số tài khoản, tin đăng và đơn hàng — có nhãn rõ &quot;Demo Circular&quot; — là <strong>dữ liệu trình diễn được chuẩn bị sẵn</strong>, không phải hoạt động của khách hàng thật. Product Journey vẫn là seller-declared, không được xác minh độc lập; Circular Impact phản ánh hoạt động đã ghi nhận trên nền tảng (kể cả dữ liệu demo), không phải kết quả môi trường đã được chứng nhận.
              </p>
            </section>
            <section className="border border-neutral-950 bg-neutral-950 p-6 text-white">
              <h2 className="font-display text-xl font-black uppercase">How counting works</h2>
              <ol className="mt-4 space-y-4 text-sm leading-6 text-neutral-300">
                <li><span className="font-mono text-neutral-500">01</span> Coverage uses active community listings only; seed catalog rows are excluded.</li>
                <li><span className="font-mono text-neutral-500">02</span> Circular means deadstock, pre-loved, repaired, or upcycled. “New” is specified, not circular.</li>
                <li><span className="font-mono text-neutral-500">03</span> Completed units sum order-item quantity and use the immutable journey snapshot captured at checkout.</li>
              </ol>
              <p className="mt-5 border-t border-neutral-700 pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-400">
                “Tính lúc” is calculation time, not a historical data-as-of guarantee.
              </p>
            </section>
          </aside>
        </div>

        <section className="mt-14 border-t border-neutral-300 pt-10" aria-labelledby="sdg-heading">
          <h2 id="sdg-heading" className="font-display text-2xl font-black uppercase">Responsible commerce context</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="border border-neutral-300 bg-white p-6">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em]">SDG 12 · Responsible Consumption and Production</p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">StyleHub&apos;s reuse and journey-disclosure features are directionally aligned with more responsible consumption. This is context, not certification or a measured contribution.</p>
            </div>
            <div className="border border-neutral-300 bg-white p-6">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em]">SDG 8 · Decent Work and Economic Growth</p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">C2C selling can help people recirculate value through local commerce. StyleHub does not quantify economic impact or claim formal SDG verification.</p>
            </div>
          </div>
        </section>

        <div className="mt-12 flex flex-col gap-3 border-t border-neutral-300 pt-8 sm:flex-row">
          <Link href={ROUTES.SHOP_CIRCULAR} className="inline-flex min-h-11 items-center justify-center bg-neutral-950 px-5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white">Shop circular listings</Link>
          <Link href={ROUTES.SELL} className="inline-flex min-h-11 items-center justify-center border border-neutral-950 bg-white px-5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-950">Declare a Product Journey</Link>
        </div>
      </Container>
    </div>
  );
}
