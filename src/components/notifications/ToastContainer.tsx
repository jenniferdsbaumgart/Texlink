import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import { Toast } from './Toast';

/**
 * Container para exibir toasts no canto superior direito
 */
export function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
