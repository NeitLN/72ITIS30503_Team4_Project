interface ListingBadgeProps {
  variant?: 'default' | 'inverse' | 'sold';
  children: React.ReactNode;
  className?: string;
}

/** Status chip for listings (Featured, Sold, Local brand…) in shipping-label style. */
export const ListingBadge = ({ variant = 'default', children, className = '' }: ListingBadgeProps) => {
  const variants = {
    default: 'border border-neutral-300 bg-white text-neutral-700',
    inverse: 'border border-neutral-900 bg-neutral-900 text-white',
    sold: 'border border-neutral-900 bg-neutral-900 text-white line-through decoration-1',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
