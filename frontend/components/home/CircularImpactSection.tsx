import Link from 'next/link';
import { Container } from '../ui/Container';
import { PlatformImpactPanel } from '../sustainability/PlatformImpactPanel';
import { ROUTES } from '../../constants/routes';

export function CircularImpactSection() {
  return (
    <section className="border-y border-neutral-800 bg-neutral-950 py-12 text-white sm:py-16">
      <Container>
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-400">Wear longer · circulate value</p>
            <h2 className="mt-2 max-w-2xl font-display text-3xl font-black uppercase tracking-tight sm:text-5xl">Proof, counted piece by piece.</h2>
          </div>
          <Link href={ROUTES.SHOP_CIRCULAR} className="w-fit font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-white underline underline-offset-4 focus:outline-2 focus:outline-offset-4">
            Shop circular
          </Link>
        </div>
        <PlatformImpactPanel home />
        <p className="mt-6 text-xs leading-5 text-neutral-500">
          Bao gồm dữ liệu trình diễn học phần (demo). Xem{' '}
          <Link href={`${ROUTES.SUSTAINABILITY}#demo-disclosure`} className="underline underline-offset-2 hover:text-neutral-300">
            minh bạch dữ liệu demo
          </Link>
          .
        </p>
      </Container>
    </section>
  );
}
