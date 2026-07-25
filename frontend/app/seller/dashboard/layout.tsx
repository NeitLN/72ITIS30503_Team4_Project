import type { ReactNode } from 'react';

export default function SellerDashboardLayout({ children }: { children: ReactNode }) {
  return <div className="page-zoom-boost">{children}</div>;
}
