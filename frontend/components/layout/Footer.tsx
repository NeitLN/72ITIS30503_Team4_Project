import Link from 'next/link';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';

export const Footer = () => {
  return (
    <footer className="border-t py-12 mt-auto bg-gray-50">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-4">StyleHub</h3>
            <p className="text-sm text-gray-500">
              A C2C fashion marketplace for local brands, pre-loved items, and street style lovers.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Marketplace</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href={ROUTES.SHOP} className="hover:text-black">Shop All</Link></li>
              <li><Link href={ROUTES.SELL} className="hover:text-black">Start Selling</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href={ROUTES.DELIVERY_TERMS} className="hover:text-black">Delivery Terms</Link></li>
              <li><Link href={ROUTES.CONTACT} className="hover:text-black">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href={ROUTES.ABOUT} className="hover:text-black">About StyleHub</Link></li>
              <li><Link href={ROUTES.PRIVACY_POLICY} className="hover:text-black">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm text-gray-400 border-t pt-8">
          <p>&copy; {new Date().getFullYear()} StyleHub (Demo Project). All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
};
