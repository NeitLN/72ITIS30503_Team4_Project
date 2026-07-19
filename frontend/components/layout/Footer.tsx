import Link from 'next/link';
import { Container } from '../ui/Container';
import { ROUTES } from '../../constants/routes';

const linkGroups = [
  {
    heading: 'Chợ trực tuyến',
    links: [
      { label: 'Xem tất cả sản phẩm', href: ROUTES.SHOP },
      { label: 'Bắt đầu đăng bán', href: ROUTES.SELL },
    ],
  },
  {
    heading: 'Công ty',
    links: [
      { label: 'Giới thiệu StyleHub', href: ROUTES.ABOUT },
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
              Chợ thời trang C2C cho thương hiệu địa phương, đồ đã qua sử dụng và streetwear — bán bởi
              con người, không phải nhà kho.
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
            Hà Nội · Sài Gòn · Đà Nẵng
          </p>
          <p className="text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} StyleHub — dự án demo của sinh viên. Đã đăng ký bản quyền.
          </p>
        </div>
      </Container>
    </footer>
  );
};
