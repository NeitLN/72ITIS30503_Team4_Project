import React from 'react';

interface AdminErrorStateProps {
  message: string;
}

export const AdminErrorState = ({ message }: AdminErrorStateProps) => {
  return (
    <div className="mt-6 border border-red-200 bg-red-50 p-6 text-center max-w-2xl mx-auto" role="alert">
      <p className="text-sm text-red-800 font-medium mb-4">{message}</p>
    </div>
  );
};
