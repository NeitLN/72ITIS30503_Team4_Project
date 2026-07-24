import React from 'react';
import { vi, tStatus } from '../../../lib/i18n';

interface AdminStatusBadgeProps {
  status: string;
}

export const AdminStatusBadge = ({ status }: AdminStatusBadgeProps) => {
  let colorClass = 'border-neutral-600 bg-neutral-50 text-neutral-800';

  if (status === 'pending') {
    colorClass = 'border-yellow-600 bg-yellow-50 text-yellow-800';
  } else if (status === 'processing') {
    colorClass = 'border-blue-600 bg-blue-50 text-blue-800';
  } else if (status === 'completed' || status === 'released') {
    colorClass = 'border-green-600 bg-green-50 text-green-800';
  } else if (status === 'cancelled' || status === 'refunded' || status === 'failed') {
    colorClass = 'border-red-600 bg-red-50 text-red-800';
  } else if (status === 'held') {
    colorClass = 'border-purple-600 bg-purple-50 text-purple-800';
  } else if (status === 'allocated') {
    colorClass = 'border-teal-600 bg-teal-50 text-teal-800';
  }

  // Attempt to use global tStatus. If not translated, use raw status.
  const translatedStatus = tStatus(status);
  const displayStatus = translatedStatus === status && status !== 'pending' ? status : translatedStatus;

  return (
    <span className={`inline-flex items-center border px-2 py-0.5 font-mono text-[10px] uppercase font-bold ${colorClass}`}>
      {displayStatus}
    </span>
  );
};
