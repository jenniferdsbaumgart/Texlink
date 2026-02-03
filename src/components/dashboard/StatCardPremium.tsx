import { ReactNode } from 'react';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Sparkline } from '../ui/Sparkline';
import { TrendingUp, TrendingDown } from 'lucide-react';

export type StatCardColor = 'brand' | 'green' | 'amber' | 'purple' | 'red' | 'blue';

interface StatCardPremiumProps {
  icon: ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: number; // percentage change
  sparklineData?: number[];
  color?: StatCardColor;
  className?: string;
}

const colorConfig: Record<StatCardColor, {
  icon: string;
  glow: string;
  spark: string;
  border: string;
}> = {
  brand: {
    icon: 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]',
    spark: 'rgb(14, 165, 233)',
    border: 'group-hover:border-brand-300 dark:group-hover:border-brand-700'
  },
  blue: {
    icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    spark: 'rgb(59, 130, 246)',
    border: 'group-hover:border-blue-300 dark:group-hover:border-blue-700'
  },
  green: {
    icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    spark: 'rgb(34, 197, 94)',
    border: 'group-hover:border-emerald-300 dark:group-hover:border-emerald-700'
  },
  amber: {
    icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    spark: 'rgb(245, 158, 11)',
    border: 'group-hover:border-amber-300 dark:group-hover:border-amber-700'
  },
  purple: {
    icon: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]',
    spark: 'rgb(139, 92, 246)',
    border: 'group-hover:border-purple-300 dark:group-hover:border-purple-700'
  },
  red: {
    icon: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]',
    spark: 'rgb(239, 68, 68)',
    border: 'group-hover:border-red-300 dark:group-hover:border-red-700'
  }
};

export const StatCardPremium: React.FC<StatCardPremiumProps> = ({
  icon,
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  trend,
  sparklineData,
  color = 'brand',
  className = ''
}) => {
  const config = colorConfig[color];
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <div
      className={`
        group relative bg-white dark:bg-gray-800 rounded-2xl
        border border-gray-200 dark:border-gray-700
        p-5 transition-all duration-300
        hover:border-transparent hover:-translate-y-1
        ${config.glow} ${config.border}
        ${className}
      `}
    >
      {/* Gradient border overlay on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10"
        style={{
          background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, var(--brand-400), #8b5cf6) border-box',
          border: '2px solid transparent',
          margin: '-1px'
        }}
      />

      <div className="relative z-10">
        {/* Header with icon and sparkline */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              transition-transform duration-300 group-hover:scale-110
              ${config.icon}
            `}
          >
            {icon}
          </div>
          {sparklineData && sparklineData.length > 1 && (
            <Sparkline
              data={sparklineData}
              color={config.spark}
              width={72}
              height={28}
            />
          )}
        </div>

        {/* Value and label */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              <AnimatedNumber
                value={value}
                prefix={prefix}
                suffix={suffix}
                decimals={decimals}
              />
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {label}
            </p>
          </div>

          {/* Trend indicator */}
          {trend !== undefined && trend !== 0 && (
            <div
              className={`
                flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg
                ${isPositive
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                  : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
                }
              `}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCardPremium;
