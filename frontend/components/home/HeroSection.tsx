import Link from 'next/link';
import { Button } from '../ui/Button';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';

export const HeroSection = () => {
  return (
    <section className="bg-black text-white py-24 sm:py-32 relative overflow-hidden">
      {/* Optional faint texture/pattern or gradient background can go here */}
      <div className="absolute inset-0 bg-gradient-to-tr from-gray-900 to-black opacity-80" />
      
      <Container className="relative z-10">
        <div className="max-w-3xl">
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Buy, Sell & Discover <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-300 to-white">Streetwear</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-10 max-w-2xl font-medium leading-relaxed">
            A C2C fashion marketplace for local brands, pre-loved items, and street style lovers in Vietnam.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={ROUTES.SHOP}>
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 bg-white text-black hover:bg-gray-200">
                Shop Now &rarr;
              </Button>
            </Link>
            <Link href={ROUTES.SELL}>
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 bg-transparent text-white border-2 border-white hover:bg-white hover:text-black">
                Start Selling
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
};
