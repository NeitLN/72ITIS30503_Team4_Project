import React from 'react';
import { Container } from '../../ui/Container';

interface AdminPageShellProps {
  children: React.ReactNode;
  className?: string;
}

export const AdminPageShell = ({ children, className = '' }: AdminPageShellProps) => {
  return (
    <Container className={`py-10 sm:py-16 max-w-7xl ${className}`}>
      {children}
    </Container>
  );
};
