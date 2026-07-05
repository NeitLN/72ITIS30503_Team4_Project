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
    label: 'Nothing on the rack',
    title: 'No listings found.',
    body: 'Try checking another category or coming back later.',
  },
  error: {
    label: 'Connection issue',
    title: 'We could not load marketplace listings right now.',
    body: 'Make sure the backend server is running.',
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


