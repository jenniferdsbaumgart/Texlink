import React, { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  fullWidth?: boolean;
}

const resizeStyles = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      resize = 'vertical',
      fullWidth = false,
      disabled,
      id,
      className = '',
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substring(2, 9)}`;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;

    const hasError = !!error;
    const describedBy = [
      helperText && !hasError ? helperId : null,
      hasError ? errorId : null,
    ]
      .filter(Boolean)
      .join(' ');

    const stateStyles = hasError
      ? 'border-red-500 dark:border-red-400 focus:border-red-500 focus:ring-red-500/20'
      : success
      ? 'border-green-500 dark:border-green-400 focus:border-green-500 focus:ring-green-500/20'
      : 'border-gray-200 dark:border-gray-700 focus:border-brand-500 focus:ring-brand-500/20';

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={describedBy || undefined}
          className={`
            block rounded-lg border px-4 py-2.5 text-sm
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-white
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            focus:outline-none focus:ring-4
            transition-all duration-200
            disabled:bg-gray-50 dark:disabled:bg-gray-900
            disabled:text-gray-500 dark:disabled:text-gray-500
            disabled:cursor-not-allowed
            ${stateStyles}
            ${resizeStyles[resize]}
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `}
          {...props}
        />
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

Textarea.displayName = 'Textarea';

export default Textarea;
