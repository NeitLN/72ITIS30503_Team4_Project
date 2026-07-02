interface ShopEmptyStateProps {
  variant?: 'empty' | 'error';
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

export const ShopEmptyState = ({ variant = 'empty' }: ShopEmptyStateProps) => {
  const { label, title, body } = copy[variant];
  return (
    <div className="border border-neutral-200 bg-neutral-50 px-6 py-20 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">{label}</p>
      <h2 className="mt-3 font-display text-xl font-extrabold uppercase tracking-tight text-neutral-900">
        {title}
      </h2>
      <p className="mt-2 text-sm text-neutral-500">{body}</p>
    </div>
  );
};
