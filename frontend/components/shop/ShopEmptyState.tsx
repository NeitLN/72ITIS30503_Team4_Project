import Link from 'next/link';

interface ShopEmptyStateProps {
  variant?: 'empty' | 'error';
  title?: string;
  body?: string;
  actionText?: string;
  actionHref?: string;
}

const copy = {
  empty: {
    label: 'Kệ hàng trống trơn',
    title: 'Không tìm thấy tin đăng.',
    body: 'Hãy thử danh mục khác hoặc quay lại sau.',
  },
  error: {
    label: 'Lỗi kết nối',
    title: 'Không thể tải tin đăng trên sàn mua bán vào lúc này.',
    body: 'Vui lòng kiểm tra máy chủ backend có đang hoạt động không.',
  },
};

export const ShopEmptyState = ({ variant = 'empty', title, body, actionText, actionHref }: ShopEmptyStateProps) => {
  const defaultCopy = copy[variant];
  const displayTitle = title || defaultCopy.title;
  const displayBody = body || defaultCopy.body;

  return (
    <div className="border border-neutral-200 bg-neutral-50 px-6 py-20 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">{defaultCopy.label}</p>
      <h2 className="mt-3 font-display text-xl font-extrabold uppercase tracking-tight text-neutral-900">
        {displayTitle}
      </h2>
      <p className="mt-2 text-sm text-neutral-500">{displayBody}</p>
      {actionText && actionHref && (
        <div className="mt-6">
          <Link 
            href={actionHref}
            className="inline-flex bg-neutral-900 px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-neutral-700 rounded-sm"
          >
            {actionText}
          </Link>
        </div>
      )}
    </div>
  );
};


