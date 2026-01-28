import React from 'react';
import { Check, Clock, XCircle } from 'lucide-react';

export type TimelineStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'COMPLIANCE'
  | 'APPROVED'
  | 'INVITED'
  | 'ACTIVE';

interface StatusHistoryItem {
  status: string;
  createdAt: string | Date;
  reason?: string;
}

interface TimelineStatusProps {
  currentStatus: string;
  history?: StatusHistoryItem[];
  className?: string;
}

interface TimelineStep {
  key: TimelineStatus;
  label: string;
  description: string;
  matchingStatuses: string[];
}

const timelineSteps: TimelineStep[] = [
  {
    key: 'DRAFT',
    label: 'Rascunho',
    description: 'Credencial criada',
    matchingStatuses: ['DRAFT'],
  },
  {
    key: 'VALIDATING',
    label: 'Validação',
    description: 'Validando CNPJ',
    matchingStatuses: ['PENDING_VALIDATION', 'VALIDATING', 'VALIDATION_FAILED'],
  },
  {
    key: 'COMPLIANCE',
    label: 'Compliance',
    description: 'Análise de compliance',
    matchingStatuses: ['PENDING_COMPLIANCE', 'COMPLIANCE_APPROVED', 'COMPLIANCE_REJECTED'],
  },
  {
    key: 'APPROVED',
    label: 'Aprovado',
    description: 'Pronto para convidar',
    matchingStatuses: ['INVITATION_PENDING'],
  },
  {
    key: 'INVITED',
    label: 'Convidado',
    description: 'Convite enviado',
    matchingStatuses: ['INVITATION_SENT', 'INVITATION_OPENED', 'ONBOARDING_STARTED', 'ONBOARDING_IN_PROGRESS', 'CONTRACT_PENDING', 'CONTRACT_SIGNED'],
  },
  {
    key: 'ACTIVE',
    label: 'Ativo',
    description: 'Facção ativa',
    matchingStatuses: ['ACTIVE'],
  },
];

const getStepStatus = (
  step: TimelineStep,
  currentStatus: string,
  currentStepIndex: number,
  stepIndex: number
): 'completed' | 'current' | 'pending' | 'error' => {
  // Check if there's a failed status
  const isValidationFailed = currentStatus === 'VALIDATION_FAILED' && step.key === 'VALIDATING';
  const isComplianceRejected = currentStatus === 'COMPLIANCE_REJECTED' && step.key === 'COMPLIANCE';
  const isInvitationExpired = currentStatus === 'INVITATION_EXPIRED' && step.key === 'INVITED';

  if (isValidationFailed || isComplianceRejected || isInvitationExpired) {
    return 'error';
  }

  if (stepIndex < currentStepIndex) {
    return 'completed';
  } else if (stepIndex === currentStepIndex) {
    return 'current';
  } else {
    return 'pending';
  }
};

const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const TimelineStatus: React.FC<TimelineStatusProps> = ({
  currentStatus,
  history = [],
  className = '',
}) => {
  // Find which step we're currently on
  const currentStepIndex = timelineSteps.findIndex((step) =>
    step.matchingStatuses.includes(currentStatus)
  );

  // Get date for each step from history
  const getStepDate = (step: TimelineStep): string | null => {
    const historyItem = history.find((h) => step.matchingStatuses.includes(h.status));
    return historyItem ? formatDate(historyItem.createdAt) : null;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-6">
        Progresso do Credenciamento
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-0 right-0 top-6 h-0.5 bg-gray-200 dark:bg-gray-700" />

        <div className="relative flex items-start justify-between">
          {timelineSteps.map((step, index) => {
            const status = getStepStatus(step, currentStatus, currentStepIndex, index);
            const stepDate = getStepDate(step);

            return (
              <div key={step.key} className="flex flex-col items-center relative group" style={{ width: '16.666%' }}>
                {/* Step circle */}
                <div
                  className={`
                    relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4
                    transition-all duration-300
                    ${status === 'completed'
                      ? 'bg-green-500 border-green-500 dark:bg-green-600 dark:border-green-600'
                      : status === 'current'
                        ? 'bg-blue-500 border-blue-500 dark:bg-blue-600 dark:border-blue-600 shadow-lg shadow-blue-500/50'
                        : status === 'error'
                          ? 'bg-red-500 border-red-500 dark:bg-red-600 dark:border-red-600'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    }
                  `}
                >
                  {status === 'completed' ? (
                    <Check className="h-6 w-6 text-white" />
                  ) : status === 'current' ? (
                    <Clock className="h-6 w-6 text-white animate-pulse" />
                  ) : status === 'error' ? (
                    <XCircle className="h-6 w-6 text-white" />
                  ) : (
                    <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{index + 1}</span>
                  )}
                </div>

                {/* Step label */}
                <div className="mt-3 text-center">
                  <p
                    className={`
                      text-xs font-medium mb-0.5
                      ${status === 'current' || status === 'completed'
                        ? 'text-gray-900 dark:text-white'
                        : status === 'error'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }
                    `}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{step.description}</p>
                </div>

                {/* Tooltip on hover with date */}
                {stepDate && (
                  <div className="absolute top-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 mt-2">
                    <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                      {stepDate}
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineStatus;
