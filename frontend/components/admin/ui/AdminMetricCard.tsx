import React from 'react';

interface AdminMetricCardProps {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  emphasized?: boolean;
}

export const AdminMetricCard = ({ label, value, note, emphasized = false }: AdminMetricCardProps) => {
  return (
    <div className={`border border-neutral-200 p-4 ${emphasized ? 'bg-neutral-50' : 'bg-white'}`}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="font-mono text-2xl font-bold text-neutral-900 mt-1">{value}</p>
      {note && <div className="mt-1">{note}</div>}
    </div>
  );
};
