import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Sparkline } from '../ui/Sparkline';

export type MetricCardColor = 'brand' | 'green' | 'amber' | 'purple' | 'red' | 'blue' | 'indigo';
export type MetricCardSize = 'default' | 'large';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: number;
  trendLabel?: string;
  sparklineData?: number[];
  color?: MetricCardColor;
  size?: MetricCardSize;
  onClick?: () => void;
  className?: string;
}

const colorConfig: Record<MetricCardColor, {
  iconBg: string;
  iconColor: string;
  sparkColor: string;
  glowColor: string;
  borderHover: string;
}> = {
  brand: {
    iconBg: 'bg-sky-500/10 dark:bg-sky-500/20',
    iconColor: 'text-sky-500',
    sparkColor: 'rgb(14, 165, 233)',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(14,165,233,0.15)]',
    borderHover: 'group-hover:border-sky-500/30',
  },
  blue: {
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    iconColor: 'text-blue-500',
    sparkColor: 'rgb(59, 130, 246)',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]',
    borderHover: 'group-hover:border-blue-500/30',
  },
  green: {
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    iconColor: 'text-emerald-500',
    sparkColor: 'rgb(16, 185, 129)',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    borderHover: 'group-hover:border-emerald-500/30',
  },
  amber: {
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: 'text-amber-500',
    sparkColor: 'rgb(245, 158, 11)',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]',
    borderHover: 'group-hover:border-amber-500/30',
  },
  purple: {
    iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    iconColor: 'text-purple-500',
    sparkColor: 'rgb(139, 92, 246)',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]',
    borderHover: 'group-hover:border-purple-500/30',
  },
  red: {
    iconBg: 'bg-red-500/10 dark:bg-red-500/20',
    iconColor: 'text-red-500',
    sparkColor: 'rgb(239, 68, 68)',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]',
    borderHover: 'group-hover:border-red-500/30',
  },
  indigo: {
    iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    iconColor: 'text-indigo-500',
    sparkColor: 'rgb(99, 102, 241)',
    glowColor: 'group-hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]',
    borderHover: 'group-hover:border-indigo-500/30',
  },
};

/**
 * MetricCard - Premium metric display card with glass morphism
 * Inspired by Linear.app and Stripe dashboard design
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  trend,
  trendLabel,
  sparklineData,
  color = 'brand',
  size = 'default',
  onClick,
  className = ''
}) => {
  const config = colorConfig[color];
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;
  const isLarge = size === 'large';

  const CardWrapper = onClick ? 'button' : 'div';

  return (
    <CardWrapper
      onClick={onClick}
      className={`
        group relative w-full text-left
        metric-card
        bg-white dark:bg-slate-900
        border border-gray-200 dark:border-white/[0.06]
        rounded-2xl
        ${isLarge ? 'p-6 lg:p-8' : 'p-5'}
        transition-all duration-300
        ${config.glowColor}
        ${config.borderHover}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10">
        {/* Header: Icon and Sparkline */}
        <div className="flex items-start justify-between mb-4">
          <div className={`
            ${isLarge ? 'w-14 h-14' : 'w-12 h-12'}
            rounded-xl flex items-center justify-center
            ${config.iconBg}
            transition-transform duration-300 group-hover:scale-110
          `}>
            <span className={config.iconColor}>
              {icon}
            </span>
          </div>

          {sparklineData && sparklineData.length > 1 && (
            <Sparkline
              data={sparklineData}
              color={config.sparkColor}
              width={isLarge ? 100 : 80}
              height={isLarge ? 36 : 28}
            />
          )}
        </div>

        {/* Value */}
        <div className={`
          ${isLarge ? 'metric-value-lg' : 'metric-value'}
          text-gray-900 dark:text-white
          mb-2
        `}>
          <AnimatedNumber
            value={value}
            prefix={prefix}
            suffix={suffix}
            decimals={decimals}
          />
        </div>

        {/* Label and Trend */}
        <div className="flex items-center justify-between gap-2">
          <p className="metric-label text-gray-500 dark:text-gray-400">
            {label}
          </p>

          {trend !== undefined && trend !== 0 && (
            <div className={`
              trend-badge
              ${isPositive ? 'trend-badge-up' : 'trend-badge-down'}
            `}>
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{Math.abs(trend)}%</span>
              {trendLabel && (
                <span className="text-gray-500 dark:text-gray-400 font-normal ml-1">
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </CardWrapper>
  );
};

export default MetricCard;
