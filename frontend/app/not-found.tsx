import Link from 'next/link';
import { Metadata } from 'next';
import { Container } from '../components/ui/Container';
import { ROUTES } from '../constants/routes';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
};

export default function NotFound() {
  return (
    <Container className="max-w-2xl py-24 text-center sm:py-32">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-500">404</p>
      <h1 className="font-display text-4xl font-black uppercase tracking-tight text-neutral-900 sm:text-5xl">
        Không tìm thấy trang
      </h1>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-neutral-600 sm:text-lg">
        Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
      </p>
      <div className="mt-8 flex justify-center">
        <Link
          href={ROUTES.HOME}
          className="inline-flex items-center justify-center bg-neutral-900 px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-neutral-700"
        >
          Về trang chủ
        </Link>
      </div>
    </Container>
  );
}
