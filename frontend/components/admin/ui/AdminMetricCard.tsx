import React from 'react';

interface AdminMetricCardProps {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  emphasized?: boolean;
}

export const AdminMetricCard = ({ label, value, note, emphasized = false }: AdminMetricCardProps) => {
  return (
    <div className={`border border-neutral-200 p-5 sm:p-6 min-h-[110px] flex flex-col justify-center ${emphasized ? 'bg-neutral-50' : 'bg-white'}`}>
      <p className="font-mono text-[11px] sm:text-xs uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="font-mono text-3xl lg:text-4xl font-bold text-neutral-900 mt-2">{value}</p>
      {note && <div className="mt-2 text-[13px] sm:text-sm">{note}</div>}
    </div>
  );
};
