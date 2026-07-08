import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] disabled:cursor-not-allowed disabled:opacity-50 rounded-[var(--radius-card)]';
  const variants = {
    primary: 'bg-[var(--brand-accent)] text-[var(--background)] hover:bg-opacity-90',
    secondary: 'border border-[var(--brand-accent)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--brand-accent)] hover:text-[var(--background)]',
    outline: 'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:border-[var(--brand-accent)]',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-sm',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};
