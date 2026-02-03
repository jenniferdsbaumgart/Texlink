import { ReactNode, useState } from 'react';
import { MoreHorizontal, Download, Maximize2 } from 'lucide-react';

type TimePeriod = '7d' | '30d' | '90d' | '12m';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showPeriodSelector?: boolean;
  defaultPeriod?: TimePeriod;
  onPeriodChange?: (period: TimePeriod) => void;
  onExport?: () => void;
  className?: string;
  minHeight?: string;
}

const periodLabels: Record<TimePeriod, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  '12m': '12 meses',
};

/**
 * ChartCard - Container for charts with header, period selector and actions
 */
export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  showPeriodSelector = true,
  defaultPeriod = '30d',
  onPeriodChange,
  onExport,
  className = '',
  minHeight = '300px',
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(defaultPeriod);
  const [showMenu, setShowMenu] = useState(false);

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  return (
    <div
      className={`
        chart-container
        bg-white dark:bg-slate-900
        border border-gray-200 dark:border-white/[0.06]
        rounded-2xl
        overflow-hidden
        dashboard-section
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          {showPeriodSelector && (
            <div className="hidden sm:flex items-center bg-gray-100 dark:bg-white/[0.05] rounded-lg p-1">
              {(Object.keys(periodLabels) as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md transition-all
                    ${selectedPeriod === period
                      ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                  `}
                >
                  {periodLabels[period]}
                </button>
              ))}
            </div>
          )}

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.05] rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1">
                  {onExport && (
                    <button
                      onClick={() => {
                        onExport();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Download className="w-4 h-4" />
                      Exportar dados
                    </button>
                  )}
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Maximize2 className="w-4 h-4" />
                    Expandir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chart Content */}
      <div
        className="p-4 lg:p-6"
        style={{ minHeight: minHeight }}
      >
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
