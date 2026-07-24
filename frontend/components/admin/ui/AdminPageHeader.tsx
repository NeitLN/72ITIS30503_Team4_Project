import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
  action?: React.ReactNode;
}

export const AdminPageHeader = ({ title, description, eyebrow = 'Trung tâm điều hành', action }: AdminPageHeaderProps) => {
  return (
    <div className="border-b border-neutral-200 pb-5 mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-500">
          {eyebrow}
        </span>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-neutral-900 mt-1.5">
          {title}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {description}
        </p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
