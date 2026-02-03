import React, { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm pr-8',
  md: 'px-4 py-2.5 text-sm pr-10',
  lg: 'px-4 py-3 text-base pr-10',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options,
      placeholder,
      size = 'md',
      fullWidth = false,
      disabled,
      id,
      className = '',
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substring(2, 9)}`;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    const hasError = !!error;
    const describedBy = [
      helperText && !hasError ? helperId : null,
      hasError ? errorId : null,
    ]
      .filter(Boolean)
      .join(' ');

    const stateStyles = hasError
      ? 'border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500/20'
      : 'border-gray-200 dark:border-gray-700 focus:border-brand-500 focus:ring-brand-500/20';

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={describedBy || undefined}
            className={`
              block rounded-lg border appearance-none cursor-pointer
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-white
              focus:outline-none focus:ring-4
              transition-all duration-200
              disabled:bg-gray-50 dark:disabled:bg-gray-900
              disabled:text-gray-500 dark:disabled:text-gray-500
              disabled:cursor-not-allowed
              ${stateStyles}
              ${sizeStyles[size]}
              ${fullWidth ? 'w-full' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className={`
              absolute right-3 top-1/2 -translate-y-1/2
              pointer-events-none
              text-gray-400 dark:text-gray-500
              h-4 w-4
            `}
          />
        </div>
        {helperText && !hasError && (
          <p id={helperId} className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
        {hasError && (
          <p id={errorId} className="mt-1.5 text-sm text-red-500 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
