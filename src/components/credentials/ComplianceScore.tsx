import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComplianceScoreProps {
  creditScore?: number | null;
  fiscalScore?: number | null;
  overallScore?: number | null;
  showDetails?: boolean;
  className?: string;
}

interface ScoreConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
}

const getScoreConfig = (score: number): ScoreConfig => {
  if (score >= 81) {
    return {
      label: 'Excelente',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      textColor: 'text-blue-700 dark:text-blue-400',
      icon: <TrendingUp className="h-4 w-4" />,
    };
  } else if (score >= 61) {
    return {
      label: 'Bom',
      color: 'bg-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      textColor: 'text-green-700 dark:text-green-400',
      icon: <TrendingUp className="h-4 w-4" />,
    };
  } else if (score >= 31) {
    return {
      label: 'Regular',
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      icon: <Minus className="h-4 w-4" />,
    };
  } else {
    return {
      label: 'Baixo',
      color: 'bg-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      textColor: 'text-red-700 dark:text-red-400',
      icon: <TrendingDown className="h-4 w-4" />,
    };
  }
};

interface ScoreBarProps {
  label: string;
  score: number | null | undefined;
  showLabel?: boolean;
}

const ScoreBar: React.FC<ScoreBarProps> = ({ label, score, showLabel = true }) => {
  if (score === null || score === undefined) {
    return (
      <div className="space-y-2">
        {showLabel && <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gray-300 dark:bg-gray-600 w-0" />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">Não calculado</p>
      </div>
    );
  }

  const config = getScoreConfig(score);

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
          <div className={`flex items-center gap-1 text-xs font-semibold ${config.textColor}`}>
            {config.icon}
            <span>{config.label}</span>
          </div>
        </div>
      )}
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${config.color} transition-all duration-500 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {score}/100 pontos
      </p>
    </div>
  );
};

export const ComplianceScore: React.FC<ComplianceScoreProps> = ({
  creditScore,
  fiscalScore,
  overallScore,
  showDetails = true,
  className = '',
}) => {
  const hasScores = creditScore !== null || fiscalScore !== null || overallScore !== null;

  if (!hasScores) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Scores de Compliance
        </h3>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
            <TrendingUp className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Análise de compliance não realizada
          </p>
        </div>
      </div>
    );
  }

  const displayScore = overallScore ?? creditScore ?? fiscalScore ?? 0;
  const config = getScoreConfig(displayScore);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-6">
        Scores de Compliance
      </h3>

      {/* Overall Score - Large Display */}
      {overallScore !== null && overallScore !== undefined && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Score Geral
            </p>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor}`}>
              {config.icon}
              <span className={`text-sm font-semibold ${config.textColor}`}>
                {config.label}
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-end justify-center mb-2">
              <span className="text-5xl font-bold text-gray-900 dark:text-white">
                {overallScore}
              </span>
              <span className="text-2xl text-gray-500 dark:text-gray-400 mb-1 ml-1">/100</span>
            </div>

            {/* Circular progress */}
            <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${config.color} transition-all duration-500 ease-out`}
                style={{ width: `${overallScore}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Detailed Scores */}
      {showDetails && (creditScore !== null || fiscalScore !== null) && (
        <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-700">
          {creditScore !== null && creditScore !== undefined && (
            <ScoreBar label="Score de Crédito" score={creditScore} />
          )}

          {fiscalScore !== null && fiscalScore !== undefined && (
            <ScoreBar label="Score Fiscal" score={fiscalScore} />
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Classificação:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">81-100: Excelente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">61-80: Bom</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">31-60: Regular</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">0-30: Baixo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceScore;
