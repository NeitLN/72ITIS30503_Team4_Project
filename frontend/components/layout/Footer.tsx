import Link from 'next/link';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';

const linkGroups = [
  {
    heading: 'MUA SẮM',
    links: [
      { label: 'Xem tất cả sản phẩm', href: ROUTES.SHOP },
      { label: 'Đăng bán sản phẩm', href: ROUTES.SELL },
    ],
  },
  {
    heading: 'VỀ STYLEHUB',
    links: [
      { label: 'Giới thiệu StyleHub', href: ROUTES.ABOUT },
      { label: 'Giá trị tuần hoàn', href: ROUTES.SUSTAINABILITY },
      { label: 'Liên hệ', href: ROUTES.CONTACT },
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
              Sàn thương mại điện tử C2C, nơi mọi người có thể mua, bán và khám phá những món đồ thuộc nhiều thương hiệu và phong cách khác nhau.
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
            NGƯỜI MUA VÀ NGƯỜI BÁN TRÊN TOÀN QUỐC — KHẮP 34 TỈNH, THÀNH
          </p>
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} StyleHub — Dự án học phần đại học. Mọi quyền được bảo lưu.
          </p>
        </div>
      </Container>
    </footer>
  );
};
