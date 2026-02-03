import { PieChart, Pie, Cell, Tooltip, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface StatusDataPoint {
  name: string;
  value: number;
  color: string;
}

interface DonutChartStatusProps {
  data: StatusDataPoint[];
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

const CustomTooltip: React.FC<TooltipProps<ValueType, NameType>> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload as StatusDataPoint;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[120px]">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {data.name}
        </span>
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
        {data.value}
      </p>
    </div>
  );
};

/**
 * DonutChartStatus - Donut chart for status distribution
 * With center text and custom styled segments
 */
export const DonutChartStatus: React.FC<DonutChartStatusProps> = ({
  data,
  centerLabel,
  centerValue,
  height = 200,
  innerRadius = 60,
  outerRadius = 85,
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col">
      {/* Chart Container */}
      <div className="relative flex items-center justify-center" style={{ height }}>
        <PieChart width={height} height={height}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                className="transition-all duration-200 hover:opacity-80 focus:outline-none"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                }}
              />
            ))}
          </Pie>
          <Tooltip content={(props) => <CustomTooltip {...props} />} />
        </PieChart>

        {/* Center Text */}
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {centerValue && (
              <p className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
                {centerValue}
              </p>
            )}
            {centerLabel && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                {centerLabel}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-6 p-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-xs sm:text-sm border-b border-gray-100 dark:border-white/[0.05] pb-2 last:border-0">
            <div className="flex items-center gap-2 truncate">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600 dark:text-gray-400 truncate">
                {item.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                {item.value}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChartStatus;
