import { Container } from '../ui/Container';
import { Button } from '../ui/Button';
import Link from 'next/link';
import { ROUTES } from '../../constants/routes';

export const SellerCTA = () => {
  return (
    <section className="py-24 border-t">
      <Container>
        <div className="bg-black text-white rounded-2xl p-8 sm:p-16 overflow-hidden relative">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
              Clear out your closet. <br className="hidden sm:block" /> Make some cash.
            </h2>
            <p className="text-gray-300 text-lg sm:text-xl mb-10 leading-relaxed">
              Anyone can be a seller on StyleHub. Snap a few photos, set your price, and reach thousands of buyers looking for their next fit.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10 text-sm font-medium">
              <div className="flex flex-col gap-2">
                <span className="text-2xl">📸</span>
                <span>Upload Photos</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-2xl">📝</span>
                <span>Add Details</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-2xl">🏷️</span>
                <span>Set Price</span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-2xl">📦</span>
                <span>Ship & Earn</span>
              </div>
            </div>

            <Link href={ROUTES.SELL}>
              <Button size="lg" className="bg-white text-black hover:bg-gray-200 text-lg px-8">
                Start Selling Today
              </Button>
            </Link>
          </div>
          
          {/* Abstract graphic shape on the right */}
          <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-gray-800 to-transparent opacity-50 hidden lg:block" />
        </div>
      </Container>
    </section>
  );
};
