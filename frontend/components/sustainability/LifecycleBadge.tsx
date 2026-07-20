import { getLifecycleOption, isSpecifiedLifecycle, type LifecycleType } from '../../lib/productJourney';

interface LifecycleBadgeProps {
  lifecycle?: LifecycleType | null;
  showNotSpecified?: boolean;
  testId?: string;
  className?: string;
}

export function LifecycleBadge({
  lifecycle,
  showNotSpecified = false,
  testId = 'lifecycle-badge',
  className = '',
}: LifecycleBadgeProps) {
  if (!lifecycle || (!showNotSpecified && !isSpecifiedLifecycle(lifecycle))) return null;
  const option = getLifecycleOption(lifecycle);
  if (!option) return null;

  return (
    <span
      data-testid={testId}
      className={`inline-flex w-fit items-center border border-neutral-300 bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-700 ${className}`}
    >
      {option.previewLabel}
    </span>
  );
}
