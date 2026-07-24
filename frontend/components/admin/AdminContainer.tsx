import React from 'react';

interface AdminContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const AdminContainer: React.FC<AdminContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`mx-auto w-[92vw] max-w-[1680px] px-5 sm:px-6 lg:px-8 xl:px-10 ${className}`}>
      {children}
    </div>
  );
};
