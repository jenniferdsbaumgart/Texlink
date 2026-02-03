import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  disabled?: boolean;
  children: ReactElement;
  className?: string;
}

interface Position {
  top: number;
  left: number;
}

const ARROW_SIZE = 6;
const OFFSET = 8;

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  placement = 'top',
  delay = 200,
  disabled = false,
  children,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = triggerRect.top + scrollY - tooltipRect.height - OFFSET;
        left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + scrollY + OFFSET;
        left = triggerRect.left + scrollX + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left + scrollX - tooltipRect.width - OFFSET;
        break;
      case 'right':
        top = triggerRect.top + scrollY + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + scrollX + OFFSET;
        break;
    }

    // Boundary checks
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Prevent tooltip from going off-screen horizontally
    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }

    // Prevent tooltip from going off-screen vertically
    if (top < scrollY + padding) {
      top = scrollY + padding;
    } else if (top + tooltipRect.height > scrollY + viewportHeight - padding) {
      top = scrollY + viewportHeight - tooltipRect.height - padding;
    }

    setPosition({ top, left });
  }, [placement]);

  const showTooltip = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay, disabled]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    if (isVisible) {
      // Use requestAnimationFrame to ensure the tooltip is rendered before calculating position
      requestAnimationFrame(() => {
        calculatePosition();
      });
    }
  }, [isVisible, calculatePosition]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Clone the child element to add event handlers and ref
  const trigger = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      children.props.onMouseEnter?.(e);
      showTooltip();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      children.props.onMouseLeave?.(e);
      hideTooltip();
    },
    onFocus: (e: React.FocusEvent) => {
      children.props.onFocus?.(e);
      showTooltip();
    },
    onBlur: (e: React.FocusEvent) => {
      children.props.onBlur?.(e);
      hideTooltip();
    },
  });

  const arrowStyles: Record<TooltipPlacement, string> = {
    top: 'tooltip-arrow tooltip-arrow-top',
    bottom: 'tooltip-arrow tooltip-arrow-bottom',
    left: 'tooltip-arrow tooltip-arrow-left',
    right: 'tooltip-arrow tooltip-arrow-right',
  };

  const tooltipContent = isVisible && !disabled && (
    <div
      ref={tooltipRef}
      role="tooltip"
      className={`
        fixed z-tooltip
        px-3 py-2 text-sm font-medium
        text-white bg-gray-900 dark:bg-gray-700
        rounded-lg shadow-dropdown
        animate-fade-in
        max-w-xs
        pointer-events-none
        ${className}
      `}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {content}
      <span
        className={`${arrowStyles[placement]} bg-gray-900 dark:bg-gray-700`}
      />
    </div>
  );

  return (
    <>
      {trigger}
      {typeof document !== 'undefined' &&
        createPortal(tooltipContent, document.body)}
    </>
  );
};

// Simple tooltip trigger wrapper for non-element children
export interface TooltipTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({
  children,
  asChild,
}) => {
  if (asChild && React.isValidElement(children)) {
    return children;
  }
  return <span>{children}</span>;
};

export default Tooltip;
