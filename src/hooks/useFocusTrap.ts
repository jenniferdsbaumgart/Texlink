import { useEffect, useRef, useCallback, type RefObject } from 'react';

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(', ');

export interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  isOpen: boolean;
  /** Auto-focus the first focusable element when opened */
  autoFocus?: boolean;
  /** Restore focus to the previously focused element when closed */
  restoreFocus?: boolean;
  /** Element to focus when opened (if not provided, focuses first focusable element) */
  initialFocusRef?: RefObject<HTMLElement>;
  /** Element to focus when closed (if not provided, uses document.activeElement at open time) */
  finalFocusRef?: RefObject<HTMLElement>;
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  options: UseFocusTrapOptions
) {
  const {
    isOpen,
    autoFocus = true,
    restoreFocus = true,
    initialFocusRef,
    finalFocusRef,
  } = options;

  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)
    ).filter(
      (el: HTMLElement) =>
        !el.hasAttribute('disabled') &&
        el.getAttribute('tabindex') !== '-1' &&
        el.offsetParent !== null // Element is visible
    );
  }, [containerRef]);

  const focusFirstElement = useCallback(() => {
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
      return;
    }

    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements, initialFocusRef]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab: go to previous element
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: go to next element
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [getFocusableElements]
  );

  useEffect(() => {
    if (!isOpen) return;

    // Store the currently focused element
    if (restoreFocus && document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement;
    }

    // Auto-focus the first element
    if (autoFocus) {
      // Use setTimeout to ensure the modal is rendered
      const timeoutId = setTimeout(() => {
        focusFirstElement();
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, autoFocus, restoreFocus, focusFirstElement]);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    // Add event listener for Tab key
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, containerRef, handleKeyDown]);

  // Restore focus when closed
  useEffect(() => {
    if (isOpen) return;

    if (restoreFocus) {
      const elementToFocus =
        finalFocusRef?.current || previousActiveElementRef.current;

      if (elementToFocus) {
        // Use setTimeout to ensure the modal is fully closed
        const timeoutId = setTimeout(() => {
          elementToFocus.focus();
        }, 0);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [isOpen, restoreFocus, finalFocusRef]);

  return {
    getFocusableElements,
    focusFirstElement,
  };
}

export default useFocusTrap;
