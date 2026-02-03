import { ReactNode } from 'react';

interface DashboardHeroProps {
  greeting: string;
  subtitle: string;
  children?: ReactNode;
  action?: ReactNode;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  greeting,
  subtitle,
  children,
  action
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl mb-8">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-purple-500/5 to-brand-600/10 dark:from-brand-900/50 dark:via-purple-900/30 dark:to-brand-800/50 animate-gradient" />

      {/* Decorative floating elements */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 bg-brand-400/20 dark:bg-brand-500/10 rounded-full blur-3xl animate-float"
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-400/10 dark:bg-purple-500/10 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '-3s' }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-32 h-32 bg-brand-300/10 dark:bg-brand-400/5 rounded-full blur-2xl animate-float"
        style={{ animationDelay: '-1.5s' }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {greeting}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>

        {children && (
          <div className="mt-6">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Returns a contextual greeting based on current time
 */
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

export default DashboardHero;
