import { formatCondition } from '../../lib/format';

interface ConditionBadgeProps {
  condition?: string | null;
  className?: string;
}

/** Hang-tag style condition chip — mono microtext, hairline border. */
export const ConditionBadge = ({ condition, className = '' }: ConditionBadgeProps) => {
  return (
    <span
      className={`inline-flex items-center border border-neutral-300 bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-700 ${className}`}
    >
      {formatCondition(condition)}
    </span>
  );
};
