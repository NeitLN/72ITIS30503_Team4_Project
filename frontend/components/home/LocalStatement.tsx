import { Container } from '../ui/Container';

/** Editorial statement framing StyleHub as a broad, community-driven marketplace. */
export const LocalStatement = () => {
  return (
    <section className="border-t border-neutral-200 bg-white py-20 sm:py-28">
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Every piece has a story
            </p>
            <h2 className="font-display text-3xl font-black uppercase leading-[1.02] tracking-tight text-neutral-900 sm:text-5xl">
              New finds.
              <br />
              Second lives.
              <br />
              Real people.
            </h2>
          </div>
          <div className="flex flex-col justify-end lg:col-span-5">
            <p className="text-base leading-relaxed text-neutral-600 sm:text-lg">
              StyleHub is a C2C marketplace built around Vietnam&apos;s fashion community — any
              brand, any style, new or pre-loved. A hoodie that sold out in District 1, a pair of
              boots from a closet in Hà Nội, a jacket someone&apos;s finally ready to let go of — all
              condition-labelled and priced in VNĐ.
            </p>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
              New &amp; pre-loved · Every brand · Every style · Nationwide
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};
