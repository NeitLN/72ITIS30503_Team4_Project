import React from 'react';

interface AdminContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const AdminContainer: React.FC<AdminContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 ${className}`}>
      {children}
    </div>
  );
};
