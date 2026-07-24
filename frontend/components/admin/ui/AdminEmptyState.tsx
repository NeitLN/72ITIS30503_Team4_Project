import React from 'react';
import { Button } from '../../ui/Button';

interface AdminEmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  filtered?: boolean;
}

export const AdminEmptyState = ({
  title,
  description,
  icon = '📭',
  actionLabel,
  onAction,
  filtered = false
}: AdminEmptyStateProps) => {
  return (
    <div className={`mt-12 text-center border py-16 px-4 ${filtered ? 'border-dashed border-neutral-300 bg-white' : 'border-solid border-neutral-200 bg-neutral-50'}`}>
      <span className="text-3xl" aria-hidden="true">{icon}</span>
      <h2 className="mt-4 font-display text-lg font-bold uppercase tracking-tight text-neutral-900">
        {title}
      </h2>
      <p className="mt-2 text-sm text-neutral-500 mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          type="button"
          variant="outline"
          onClick={onAction}
          className="font-mono text-xs uppercase tracking-wider"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
