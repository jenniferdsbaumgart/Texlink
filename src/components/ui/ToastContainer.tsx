import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast, type Toast, type ToastType } from '../../contexts/ToastContext';

const TOAST_STYLES: Record<
  ToastType,
  {
    bg: string;
    border: string;
    icon: string;
    progress: string;
    iconComponent: React.ElementType;
  }
> = {
  success: {
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-green-200 dark:border-green-800/50',
    icon: 'text-green-500',
    progress: 'bg-green-500',
    iconComponent: CheckCircle,
  },
  error: {
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-red-200 dark:border-red-800/50',
    icon: 'text-red-500',
    progress: 'bg-red-500',
    iconComponent: XCircle,
  },
  warning: {
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-yellow-200 dark:border-yellow-800/50',
    icon: 'text-yellow-500',
    progress: 'bg-yellow-500',
    iconComponent: AlertTriangle,
  },
  info: {
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-blue-200 dark:border-blue-800/50',
    icon: 'text-blue-500',
    progress: 'bg-blue-500',
    iconComponent: Info,
  },
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

function ToastItem({ toast, onRemove, onPause, onResume }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const style = TOAST_STYLES[toast.type];
  const Icon = style.iconComponent;

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  }, [onRemove, toast.id]);

  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
    onPause(toast.id);
    if (progressRef.current) {
      progressRef.current.style.animationPlayState = 'paused';
    }
  }, [onPause, toast.id]);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
    onResume(toast.id);
    if (progressRef.current) {
      progressRef.current.style.animationPlayState = 'running';
    }
  }, [onResume, toast.id]);

  const handleActionClick = useCallback(() => {
    if (toast.action) {
      toast.action.onClick();
      handleRemove();
    }
  }, [toast.action, handleRemove]);

  // Set up progress animation duration
  useEffect(() => {
    if (progressRef.current && toast.duration && toast.duration > 0) {
      progressRef.current.style.animationDuration = `${toast.duration}ms`;
    }
  }, [toast.duration]);

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-start gap-3 p-4 rounded-xl border shadow-toast
        ${style.bg} ${style.border}
        transform transition-all duration-200 ease-spring
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        animate-slide-in-right
      `}
      role="alert"
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 mt-0.5 ${style.icon}`}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={handleActionClick}
            className={`
              mt-2 text-sm font-medium
              ${style.icon} hover:underline
              focus:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2
            `}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close Button */}
      {toast.dismissible !== false && (
        <button
          onClick={handleRemove}
          className={`
            flex-shrink-0 p-1 -m-1 rounded-lg
            text-gray-400 hover:text-gray-600 hover:bg-gray-100
            dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700
            transition-colors duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500
          `}
          aria-label="Fechar notificação"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Progress Bar */}
      {toast.duration && toast.duration > 0 && (
        <div
          ref={progressRef}
          className={`
            absolute bottom-0 left-0 h-1 rounded-b-xl
            ${style.progress} opacity-30
            toast-progress-animate
          `}
          style={{
            width: '100%',
            transformOrigin: 'left',
          }}
        />
      )}
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast, pauseToast, resumeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-toast flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      aria-label="Notificações"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            toast={toast}
            onRemove={removeToast}
            onPause={pauseToast}
            onResume={resumeToast}
          />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
