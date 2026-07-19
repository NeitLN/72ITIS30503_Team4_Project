import { Container } from '../ui/Container';

/** Editorial statement grounding StyleHub in Vietnamese local fashion culture. */
export const LocalStatement = () => {
  return (
    <section className="border-t border-neutral-200 bg-white py-20 sm:py-28">
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Local fashion, second life
            </p>
            <h2 className="font-display text-3xl font-black uppercase leading-[1.02] tracking-tight text-neutral-900 sm:text-5xl">
              Made here.
              <br />
              Worn twice.
              <br />
              Still heat.
            </h2>
          </div>
          <div className="flex flex-col justify-end lg:col-span-5">
            <p className="text-base leading-relaxed text-neutral-600 sm:text-lg">
              StyleHub is built around Vietnam&apos;s own fashion scene — local streetwear brands,
              second-hand culture, and students who trade fits between semesters. A hoodie that sold
              out in District 1 shows up here from a closet in Hà Nội, condition-labelled and priced
              in VNĐ.
            </p>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
              Local brands · Thrift culture · Streetwear · Student budgets
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};
