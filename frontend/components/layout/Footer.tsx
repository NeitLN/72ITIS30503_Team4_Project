import Link from 'next/link';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';

const linkGroups = [
  {
    heading: 'Marketplace',
    links: [
      { label: 'Shop all listings', href: ROUTES.SHOP },
      { label: 'Start selling', href: ROUTES.SELL },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About StyleHub', href: ROUTES.ABOUT },
      { label: 'Contact us', href: ROUTES.CONTACT },
    ],
  },
  {
    heading: 'Điều khoản',
    links: [
      { label: 'Chính sách bảo mật', href: ROUTES.PRIVACY_POLICY },
      { label: 'Điều khoản vận chuyển', href: ROUTES.DELIVERY_TERMS },
    ],
  },
];

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white">
      <Container>
        <div className="grid grid-cols-1 gap-10 py-14 md:grid-cols-4">
          <div>
            <p className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900">StyleHub</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
              A C2C fashion marketplace where people buy, sell, and rediscover pieces across
              different brands, styles, and stories.
            </p>
          </div>
          {linkGroups.map((group) => (
            <div key={group.heading}>
              <h4 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                {group.heading}
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-neutral-700 transition-colors hover:text-neutral-900">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-neutral-200 py-6 sm:flex-row sm:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400">
            Buyers and sellers nationwide — all 34 provinces and cities
          </p>
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} StyleHub — a student demo project. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
};
