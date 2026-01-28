import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface RiskLevelIndicatorProps {
  riskLevel: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
}

interface RiskConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const riskConfig: Record<RiskLevel, RiskConfig> = {
  LOW: {
    label: 'Risco Baixo',
    description: 'Aprovado para credenciamento',
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: <CheckCircle className="h-full w-full" />,
  },
  MEDIUM: {
    label: 'Risco Médio',
    description: 'Requer atenção',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    icon: <AlertCircle className="h-full w-full" />,
  },
  HIGH: {
    label: 'Risco Alto',
    description: 'Análise manual recomendada',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: <AlertTriangle className="h-full w-full" />,
  },
  CRITICAL: {
    label: 'Risco Crítico',
    description: 'Não recomendado para credenciamento',
    color: 'bg-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
    icon: <XCircle className="h-full w-full" />,
  },
};

const sizeConfig = {
  sm: {
    container: 'px-2 py-1 text-xs gap-1',
    icon: 'h-3 w-3',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    container: 'px-3 py-1.5 text-sm gap-1.5',
    icon: 'h-4 w-4',
    dot: 'w-2 h-2',
  },
  lg: {
    container: 'px-4 py-2 text-base gap-2',
    icon: 'h-5 w-5',
    dot: 'w-2.5 h-2.5',
  },
};

export const RiskLevelIndicator: React.FC<RiskLevelIndicatorProps> = ({
  riskLevel,
  size = 'md',
  showLabel = true,
  showIcon = true,
  className = '',
}) => {
  const config = riskConfig[riskLevel];
  const sizeStyles = sizeConfig[size];

  if (showLabel) {
    // Badge style with label
    return (
      <div
        className={`
          inline-flex items-center justify-center font-medium rounded-full border
          ${config.bgColor} ${config.textColor} ${config.borderColor}
          ${sizeStyles.container}
          ${className}
        `}
      >
        {showIcon && (
          <div className={sizeStyles.icon}>
            {config.icon}
          </div>
        )}
        <span>{config.label}</span>
      </div>
    );
  } else {
    // Compact dot style without label
    return (
      <div
        className={`
          inline-flex items-center justify-center rounded-full
          ${config.bgColor} ${config.borderColor} border
          ${sizeStyles.container}
          ${className}
        `}
        title={config.label}
      >
        <span className={`rounded-full ${config.color} ${sizeStyles.dot}`} />
      </div>
    );
  }
};

// Extended version with description
export const RiskLevelCard: React.FC<{
  riskLevel: RiskLevel;
  className?: string;
}> = ({ riskLevel, className = '' }) => {
  const config = riskConfig[riskLevel];

  return (
    <div
      className={`
        rounded-xl border p-4
        ${config.bgColor} ${config.borderColor}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.color} bg-opacity-10`}>
          <div className={`h-6 w-6 ${config.textColor}`}>
            {config.icon}
          </div>
        </div>
        <div className="flex-1">
          <h4 className={`text-sm font-semibold ${config.textColor} mb-0.5`}>
            {config.label}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {config.description}
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper component for risk level selection/display in forms
export const RiskLevelGrid: React.FC<{
  selectedRisk?: RiskLevel;
  onSelect?: (risk: RiskLevel) => void;
  className?: string;
}> = ({ selectedRisk, onSelect, className = '' }) => {
  const risks: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {risks.map((risk) => {
        const config = riskConfig[risk];
        const isSelected = selectedRisk === risk;

        return (
          <button
            key={risk}
            type="button"
            onClick={() => onSelect?.(risk)}
            disabled={!onSelect}
            className={`
              p-3 rounded-xl border-2 transition-all text-left
              ${isSelected
                ? `${config.borderColor} ${config.bgColor}`
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }
              ${onSelect ? 'hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer' : 'cursor-default'}
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-4 w-4 ${isSelected ? config.textColor : 'text-gray-400'}`}>
                {config.icon}
              </div>
              <span
                className={`
                  text-sm font-medium
                  ${isSelected ? config.textColor : 'text-gray-700 dark:text-gray-300'}
                `}
              >
                {config.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {config.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default RiskLevelIndicator;
