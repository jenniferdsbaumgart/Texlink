import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface DataPoint {
  name: string;
  value: number;
  previousValue?: number;
}

interface AreaChartRevenueProps {
  data: DataPoint[];
  showComparison?: boolean;
  valuePrefix?: string;
  color?: string;
  comparisonColor?: string;
  height?: number;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
};

interface CustomTooltipProps extends TooltipProps<ValueType, NameType> {
  valuePrefix?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, valuePrefix = 'R$ ' }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 min-w-[140px]">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {label}
      </p>
      {payload.map((entry, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {entry.name === 'value' ? 'Atual' : 'Anterior'}:
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {valuePrefix}{Number(entry.value).toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * AreaChartRevenue - Area chart for revenue/trends using Recharts
 * Styled with gradients and custom tooltip
 */
export const AreaChartRevenue: React.FC<AreaChartRevenueProps> = ({
  data,
  showComparison = false,
  valuePrefix = 'R$ ',
  color = '#0ea5e9',
  comparisonColor = '#8b5cf6',
  height = 280,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {showComparison && (
            <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={comparisonColor} stopOpacity={0.1} />
              <stop offset="95%" stopColor={comparisonColor} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#e5e7eb"
          strokeOpacity={0.5}
        />

        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          dy={10}
        />

        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          tickFormatter={formatCurrency}
          width={65}
        />

        <Tooltip
          content={(props) => <CustomTooltip {...props} valuePrefix={valuePrefix} />}
          cursor={{
            stroke: 'currentColor',
            strokeWidth: 1,
            strokeDasharray: '4 4',
          }}
        />

        {showComparison && (
          <Area
            type="monotone"
            dataKey="previousValue"
            name="previousValue"
            stroke={comparisonColor}
            strokeWidth={2}
            strokeDasharray="4 4"
            fill="url(#colorPrevious)"
            fillOpacity={1}
          />
        )}

        <Area
          type="monotone"
          dataKey="value"
          name="value"
          stroke={color}
          strokeWidth={2.5}
          fill="url(#colorValue)"
          fillOpacity={1}
          dot={false}
          activeDot={{
            r: 6,
            fill: color,
            stroke: '#fff',
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AreaChartRevenue;
