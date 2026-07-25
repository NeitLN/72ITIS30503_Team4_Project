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
    'inline-flex items-center justify-center font-semibold uppercase tracking-wide rounded-[var(--radius-card)] ' +
    'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out ' +
    'motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-reduce:transition-colors ' +
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ' +
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none';
  const variants = {
    primary: 'bg-[var(--brand-accent)] text-[var(--background)] hover:bg-opacity-90 hover:shadow-md',
    secondary: 'border border-[var(--brand-accent)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--brand-accent)] hover:text-[var(--background)] hover:shadow-sm',
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
