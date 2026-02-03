import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  strokeWidth?: number;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 80,
  height = 24,
  color = 'currentColor',
  showArea = true,
  strokeWidth = 2,
  className = ''
}) => {
  const { linePath, areaPath } = useMemo(() => {
    if (data.length < 2) {
      return { linePath: '', areaPath: '' };
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);
    const padding = height * 0.1; // 10% padding top and bottom

    const points = data.map((v, i) => ({
      x: i * step,
      y: height - padding - ((v - min) / range) * (height - 2 * padding)
    }));

    // Create smooth curve using cardinal spline
    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');

    const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

    return { linePath, areaPath };
  }, [data, width, height]);

  if (data.length < 2) {
    return null;
  }

  return (
    <svg
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
    >
      {showArea && (
        <path
          d={areaPath}
          fill={color}
          opacity="0.15"
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Highlight last point */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={(() => {
            const max = Math.max(...data);
            const min = Math.min(...data);
            const range = max - min || 1;
            const padding = height * 0.1;
            return height - padding - ((data[data.length - 1] - min) / range) * (height - 2 * padding);
          })()}
          r={3}
          fill={color}
        />
      )}
    </svg>
  );
};

export default Sparkline;
