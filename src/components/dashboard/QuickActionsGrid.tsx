import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LucideIcon } from 'lucide-react';

export interface QuickActionItem {
  id: string;
  label: string;
  description?: string;
  icon: ReactNode;
  href: string;
  badge?: number;
  color?: 'brand' | 'blue' | 'green' | 'amber' | 'purple' | 'red';
}

interface QuickActionsGridProps {
  actions: QuickActionItem[];
  columns?: 2 | 3 | 4;
  title?: string;
  className?: string;
}

const colorConfig = {
  brand: {
    iconBg: 'bg-sky-500/10 dark:bg-sky-500/20 group-hover:bg-sky-500/20 dark:group-hover:bg-sky-500/30',
    iconColor: 'text-sky-500',
    hoverGlow: 'group-hover:shadow-[0_0_30px_rgba(14,165,233,0.1)]',
  },
  blue: {
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20 group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/30',
    iconColor: 'text-blue-500',
    hoverGlow: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]',
  },
  green: {
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 group-hover:bg-emerald-500/20 dark:group-hover:bg-emerald-500/30',
    iconColor: 'text-emerald-500',
    hoverGlow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]',
  },
  amber: {
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 group-hover:bg-amber-500/20 dark:group-hover:bg-amber-500/30',
    iconColor: 'text-amber-500',
    hoverGlow: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]',
  },
  purple: {
    iconBg: 'bg-purple-500/10 dark:bg-purple-500/20 group-hover:bg-purple-500/20 dark:group-hover:bg-purple-500/30',
    iconColor: 'text-purple-500',
    hoverGlow: 'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.1)]',
  },
  red: {
    iconBg: 'bg-red-500/10 dark:bg-red-500/20 group-hover:bg-red-500/20 dark:group-hover:bg-red-500/30',
    iconColor: 'text-red-500',
    hoverGlow: 'group-hover:shadow-[0_0_30px_rgba(239,68,68,0.1)]',
  },
};

/**
 * QuickActionsGrid - Grid of action cards with icons and descriptions
 * Larger cards with hover effects and optional badges
 */
export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  actions,
  columns = 4,
  title,
  className = '',
}) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`dashboard-section ${className}`}>
      {title && (
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <div className={`grid ${gridCols[columns]} gap-4`}>
        {actions.map((action) => {
          const colors = colorConfig[action.color || 'brand'];

          return (
            <Link
              key={action.id}
              to={action.href}
              className={`
                group quick-action-card
                bg-white dark:bg-slate-900/50
                border border-gray-200 dark:border-white/[0.06]
                rounded-2xl p-5
                transition-all duration-300
                hover:border-gray-300 dark:hover:border-white/[0.1]
                ${colors.hoverGlow}
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center
                  transition-all duration-300
                  ${colors.iconBg}
                `}>
                  <span className={colors.iconColor}>
                    {action.icon}
                  </span>
                </div>

                {action.badge !== undefined && action.badge > 0 && (
                  <span className="px-2.5 py-1 text-xs font-semibold bg-red-500 text-white rounded-full min-w-[24px] text-center">
                    {action.badge > 99 ? '99+' : action.badge}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {action.label}
                  </h4>
                  {action.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {action.description}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionsGrid;
