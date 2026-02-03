import React, { type HTMLAttributes } from 'react';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';
export type SkeletonAnimation = 'pulse' | 'wave' | 'none';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  animation?: SkeletonAnimation;
  lines?: number;
  lineHeight?: string | number;
  gap?: string | number;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-lg',
};

const animationStyles: Record<SkeletonAnimation, string> = {
  pulse: 'animate-pulse-subtle',
  wave: 'skeleton',
  none: '',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'wave',
  lines = 1,
  lineHeight = '1rem',
  gap = '0.5rem',
  className = '',
  style,
  ...props
}) => {
  const baseStyles = `bg-gray-200 dark:bg-gray-700 ${variantStyles[variant]} ${animationStyles[animation]}`;

  // For text variant with multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div className={`flex flex-col ${className}`} style={{ gap, ...style }} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={baseStyles}
            style={{
              width: index === lines - 1 ? '75%' : width || '100%',
              height: lineHeight,
            }}
          />
        ))}
      </div>
    );
  }

  // Default dimensions based on variant
  const defaultDimensions = {
    text: { width: width || '100%', height: height || '1rem' },
    circular: { width: width || '3rem', height: height || '3rem' },
    rectangular: { width: width || '100%', height: height || '6rem' },
    rounded: { width: width || '100%', height: height || '6rem' },
  };

  const dimensions = defaultDimensions[variant];

  return (
    <div
      className={`${baseStyles} ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        ...style,
      }}
      {...props}
    />
  );
};

// Specialized Skeleton Components

export interface MetricCardSkeletonProps {
  className?: string;
}

export const MetricCardSkeleton: React.FC<MetricCardSkeletonProps> = ({ className = '' }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 ${className}`}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <Skeleton variant="text" width="60%" height="0.875rem" className="mb-2" />
        <Skeleton variant="text" width="40%" height="1.75rem" className="mb-2" />
        <Skeleton variant="text" width="30%" height="0.75rem" />
      </div>
      <Skeleton variant="rounded" width="3rem" height="3rem" />
    </div>
  </div>
);

export interface OrderCardSkeletonProps {
  className?: string;
}

export const OrderCardSkeleton: React.FC<OrderCardSkeletonProps> = ({ className = '' }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${className}`}
  >
    {/* Header */}
    <div className="flex items-center justify-between mb-3">
      <Skeleton variant="text" width="6rem" height="1rem" />
      <Skeleton variant="rounded" width="4rem" height="1.5rem" />
    </div>

    {/* Brand info */}
    <div className="flex items-center gap-2 mb-3">
      <Skeleton variant="circular" width="2rem" height="2rem" />
      <Skeleton variant="text" width="50%" height="0.875rem" />
    </div>

    {/* Details */}
    <div className="space-y-2 mb-3">
      <div className="flex items-center gap-2">
        <Skeleton variant="text" width="1rem" height="1rem" />
        <Skeleton variant="text" width="40%" height="0.75rem" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton variant="text" width="1rem" height="1rem" />
        <Skeleton variant="text" width="30%" height="0.75rem" />
      </div>
    </div>

    {/* Footer */}
    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
      <Skeleton variant="text" width="5rem" height="0.875rem" />
      <Skeleton variant="text" width="4rem" height="0.75rem" />
    </div>
  </div>
);

export interface TableRowSkeletonProps {
  columns?: number;
  className?: string;
}

export const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({
  columns = 5,
  className = '',
}) => (
  <tr className={className}>
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-4 py-3">
        <Skeleton
          variant="text"
          width={index === 0 ? '80%' : index === columns - 1 ? '60%' : '70%'}
          height="0.875rem"
        />
      </td>
    ))}
  </tr>
);

export interface SidebarSkeletonProps {
  itemCount?: number;
  className?: string;
}

export const SidebarSkeleton: React.FC<SidebarSkeletonProps> = ({
  itemCount = 8,
  className = '',
}) => (
  <div className={`p-4 space-y-2 ${className}`}>
    {/* Logo area */}
    <div className="flex items-center gap-3 mb-6 px-2">
      <Skeleton variant="rounded" width="2.5rem" height="2.5rem" />
      <Skeleton variant="text" width="6rem" height="1.25rem" />
    </div>

    {/* Nav items */}
    {Array.from({ length: itemCount }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 px-3 py-2">
        <Skeleton variant="rounded" width="1.25rem" height="1.25rem" />
        <Skeleton
          variant="text"
          width={`${60 + Math.random() * 30}%`}
          height="0.875rem"
        />
      </div>
    ))}
  </div>
);

export interface ListSkeletonProps {
  count?: number;
  itemHeight?: string | number;
  gap?: string | number;
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  count = 5,
  itemHeight = '4rem',
  gap = '0.75rem',
  className = '',
}) => (
  <div className={`space-y-3 ${className}`} style={{ gap }}>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ minHeight: itemHeight }}
      >
        <Skeleton variant="circular" width="2.5rem" height="2.5rem" />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" height="1rem" className="mb-2" />
          <Skeleton variant="text" width="40%" height="0.75rem" />
        </div>
        <Skeleton variant="rounded" width="5rem" height="2rem" />
      </div>
    ))}
  </div>
);

export default Skeleton;
