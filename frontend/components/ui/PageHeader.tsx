import { Container } from './Container';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  lede?: string;
}

/** Shared editorial header for static pages. */
export const PageHeader = ({ eyebrow, title, lede }: PageHeaderProps) => {
  return (
    <section className="border-b border-neutral-200 bg-neutral-50">
      <Container className="py-12 sm:py-16">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.24em] text-neutral-500">
          {eyebrow}
        </p>
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-neutral-900 sm:text-5xl">
          {title}
        </h1>
        {lede && <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-lg">{lede}</p>}
      </Container>
    </section>
  );
};
