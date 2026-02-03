import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
  dismissible?: boolean;
}

interface ToastContextData {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;
  success: (title: string, message?: string, action?: ToastAction) => string;
  error: (title: string, message?: string, action?: ToastAction) => string;
  warning: (title: string, message?: string, action?: ToastAction) => string;
  info: (title: string, message?: string, action?: ToastAction) => string;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRefs = useRef<Map<string, { timerId: ReturnType<typeof setTimeout>; remaining: number; startTime: number }>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timerInfo = timerRefs.current.get(id);
    if (timerInfo) {
      clearTimeout(timerInfo.timerId);
      timerRefs.current.delete(id);
    }
    setToasts((state) => state.filter((toast) => toast.id !== id));
  }, []);

  const pauseToast = useCallback((id: string) => {
    const timerInfo = timerRefs.current.get(id);
    if (timerInfo) {
      clearTimeout(timerInfo.timerId);
      const elapsed = Date.now() - timerInfo.startTime;
      timerInfo.remaining = timerInfo.remaining - elapsed;
    }
  }, []);

  const resumeToast = useCallback((id: string) => {
    const timerInfo = timerRefs.current.get(id);
    if (timerInfo && timerInfo.remaining > 0) {
      timerInfo.startTime = Date.now();
      timerInfo.timerId = setTimeout(() => {
        removeToast(id);
      }, timerInfo.remaining);
    }
  }, [removeToast]);

  const addToast = useCallback(
    ({ type, title, message, duration = DEFAULT_DURATION, action, dismissible = true }: Omit<Toast, 'id'>): string => {
      const id = Math.random().toString(36).substring(2, 9);

      const toast: Toast = {
        id,
        type,
        title,
        message,
        duration,
        action,
        dismissible,
      };

      setToasts((state) => {
        // Limit the number of toasts
        const newToasts = [...state, toast];
        if (newToasts.length > MAX_TOASTS) {
          // Remove oldest toasts
          const toRemove = newToasts.slice(0, newToasts.length - MAX_TOASTS);
          toRemove.forEach((t) => {
            const timerInfo = timerRefs.current.get(t.id);
            if (timerInfo) {
              clearTimeout(timerInfo.timerId);
              timerRefs.current.delete(t.id);
            }
          });
          return newToasts.slice(-MAX_TOASTS);
        }
        return newToasts;
      });

      // Set up auto-remove timer
      if (duration > 0) {
        const timerId = setTimeout(() => {
          removeToast(id);
        }, duration);

        timerRefs.current.set(id, {
          timerId,
          remaining: duration,
          startTime: Date.now(),
        });
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string, action?: ToastAction): string => {
      return addToast({ type: 'success', title, message, action });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string, action?: ToastAction): string => {
      return addToast({ type: 'error', title, message, action, duration: 8000 }); // Errors last longer
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string, action?: ToastAction): string => {
      return addToast({ type: 'warning', title, message, action });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string, action?: ToastAction): string => {
      return addToast({ type: 'info', title, message, action });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        pauseToast,
        resumeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
