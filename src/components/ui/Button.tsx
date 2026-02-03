import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-brand-500 text-white
    hover:bg-brand-600
    focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
    dark:bg-brand-600 dark:hover:bg-brand-500
    disabled:bg-brand-300 dark:disabled:bg-brand-800
  `,
  secondary: `
    bg-white text-gray-700 border border-gray-200
    hover:bg-gray-50 hover:border-gray-300
    focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2
    dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700
    dark:hover:bg-gray-700 dark:hover:border-gray-600
    disabled:bg-gray-100 dark:disabled:bg-gray-900
  `,
  ghost: `
    bg-transparent text-gray-600
    hover:bg-gray-100 hover:text-gray-900
    focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2
    dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100
    disabled:text-gray-400 dark:disabled:text-gray-600
  `,
  danger: `
    bg-red-500 text-white
    hover:bg-red-600
    focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
    dark:bg-red-600 dark:hover:bg-red-500
    disabled:bg-red-300 dark:disabled:bg-red-900
  `,
  success: `
    bg-green-500 text-white
    hover:bg-green-600
    focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2
    dark:bg-green-600 dark:hover:bg-green-500
    disabled:bg-green-300 dark:disabled:bg-green-900
  `,
  outline: `
    bg-transparent text-brand-600 border border-brand-500
    hover:bg-brand-50 hover:text-brand-700
    focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
    dark:text-brand-400 dark:border-brand-400
    dark:hover:bg-brand-950 dark:hover:text-brand-300
    disabled:border-brand-200 disabled:text-brand-300
    dark:disabled:border-brand-800 dark:disabled:text-brand-700
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-3 text-base gap-2.5 rounded-xl',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center
          font-medium
          transition-all duration-200 ease-spring
          press-scale touch-feedback
          disabled:cursor-not-allowed disabled:opacity-60
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Loader2 className={`${iconSizes[size]} animate-spin`} />
        ) : leftIcon ? (
          <span className={iconSizes[size]}>{leftIcon}</span>
        ) : null}
        <span>{children}</span>
        {!loading && rightIcon && (
          <span className={iconSizes[size]}>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
