import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
  action?: React.ReactNode;
}

export const AdminPageHeader = ({ title, description, eyebrow = 'Trung tâm điều hành', action }: AdminPageHeaderProps) => {
  return (
    <div className="border-b border-neutral-200 pb-6 mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
      <div>
        <span className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.24em] text-neutral-500">
          {eyebrow}
        </span>
        <h1 className="font-display text-3xl sm:text-4xl xl:text-[40px] font-black uppercase tracking-tight text-neutral-900 mt-2">
          {title}
        </h1>
        <p className="mt-3 text-sm sm:text-base text-neutral-500 leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
