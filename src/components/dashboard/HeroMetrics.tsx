import { ReactNode } from 'react';

interface HeroMetricsProps {
  greeting: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * HeroMetrics - Full-width hero section with gradient background
 * Contains greeting and metrics grid
 */
export const HeroMetrics: React.FC<HeroMetricsProps> = ({
  greeting,
  subtitle,
  action,
  children,
  className = ''
}) => {
  return (
    <div className={`relative overflow-hidden rounded-3xl dashboard-section ${className}`}>
      {/* Gradient Background */}
      <div className="absolute inset-0 hero-gradient" />

      {/* Animated decorative elements */}
      <div
        className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl animate-float"
      />
      <div
        className="absolute -bottom-32 -left-32 w-80 h-80 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '-3s' }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-40 h-40 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-2xl animate-float"
        style={{ animationDelay: '-1.5s' }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {greeting}
            </h1>
            {subtitle && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default HeroMetrics;
