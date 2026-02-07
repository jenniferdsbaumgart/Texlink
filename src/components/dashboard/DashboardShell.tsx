import { ReactNode } from 'react';

interface DashboardShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * DashboardShell - Main layout wrapper for dashboard pages
 * Provides consistent padding, max-width, and dark mode support
 */
export const DashboardShell: React.FC<DashboardShellProps> = ({
  children,
  className = ''
}) => {
  return (
    <div
      className={`
        min-h-screen
        bg-gray-50 dark:bg-slate-950
        transition-colors duration-300
      `}
    >
      <div
        className={`
          max-w-7xl mx-auto
          px-4 sm:px-6 lg:px-8
          pt-16 lg:pt-8
          pb-6 lg:pb-8
          space-y-6
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
};

export default DashboardShell;
