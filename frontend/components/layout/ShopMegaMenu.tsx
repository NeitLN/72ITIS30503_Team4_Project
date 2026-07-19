import Link from 'next/link';
import { ROUTES } from '../../constants/routes';
import { EN } from '../../lib/i18n';

// Fashion taxonomy is deliberately English — see the hybrid-language rubric
// in `frontend/lib/i18n.ts`. These labels mirror the live `categories` table
// (parent group + child display names) so the menu never drifts from what
// the category API actually returns.
const shopMenuGroups = [
  {
    title: 'Tops',
    items: [
      { label: 'T-Shirts & Polos', href: '/category/t-shirts' },
      { label: 'Jerseys', href: '/category/jerseys' },
      { label: 'Shirts', href: '/category/shirts' },
      { label: 'Knitwear & Cardigans', href: '/category/sweaters-cardigans' },
      { label: 'Sweatshirts & Hoodies', href: '/category/hoodies' },
      { label: 'Outerwear', href: '/category/outerwear' },
    ],
  },
  {
    title: 'Bottoms',
    items: [
      { label: 'Pants', href: '/category/pants' },
      { label: 'Shorts', href: '/category/shorts' },
    ],
  },
  {
    title: 'Shoes',
    items: [
      { label: 'Sneakers', href: '/category/shoes' },
      { label: 'Boots', href: '/category/boots' },
      { label: 'Loafers', href: '/category/loafers' },
      { label: 'Sandals & Slides', href: '/category/slides' },
      { label: 'Other Shoes', href: '/category/other-shoes' },
    ],
  },
  {
    title: 'Accessories',
    items: [
      { label: 'Other Accessories', href: '/category/accessories' },
      { label: 'Hats & Caps', href: '/category/caps-hats' },
      { label: 'Phone Cases', href: '/category/phone-cases' },
      { label: 'Wallets', href: '/category/wallets' },
      { label: 'Underwear', href: '/category/underwear' },
    ],
  },
  {
    title: 'Bags',
    items: [
      { label: 'Backpacks', href: '/category/backpacks' },
      { label: 'Crossbody Bags', href: '/category/crossbody-bags' },
      { label: 'Bowler Bags', href: '/category/bowler-bags' },
    ],
  },
];

export const ShopMegaMenu = () => {
  return (
    <div className="group static">
      <div className="flex h-16 items-center">
        <Link
          href={ROUTES.SHOP}
          className="text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-500 whitespace-nowrap"
        >
          {EN.nav.shop}
        </Link>
      </div>

      <div className="invisible absolute left-0 top-[calc(100%-1px)] w-full opacity-0 shadow-sm transition-all duration-200 group-hover:visible group-hover:opacity-100 z-50 bg-white border-y border-neutral-200 hidden lg:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-5 gap-8">
            {shopMenuGroups.map((group) => (
              <div key={group.title}>
                <h3 className="font-semibold text-neutral-950 mb-5 text-xs uppercase tracking-[0.16em] font-mono">
                  {group.title}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="block text-sm text-neutral-600 hover:text-black transition-colors whitespace-nowrap"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-6 border-t border-neutral-100">
            <Link
              href={ROUTES.SHOP}
              className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-neutral-900 hover:text-neutral-500 transition-colors"
            >
              {EN.home.viewAllProducts} &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
