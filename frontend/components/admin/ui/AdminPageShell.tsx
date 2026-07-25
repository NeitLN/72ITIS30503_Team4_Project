import React from 'react';

interface AdminPageShellProps {
  children: React.ReactNode;
  className?: string;
}

export const AdminPageShell = ({ children, className = '' }: AdminPageShellProps) => {
  return (
    <div className={`mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 2xl:px-10 py-10 sm:py-16 ${className}`}>
      {children}
    </div>
  );
};
