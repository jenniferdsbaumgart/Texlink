import React, { type ReactNode } from 'react';
import {
  Package,
  Search,
  FileText,
  Bell,
  FolderOpen,
  AlertCircle,
  MessageSquare,
  Users,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { Button, type ButtonVariant } from './Button';

export type EmptyStateIllustration =
  | 'no-orders'
  | 'no-results'
  | 'no-data'
  | 'error'
  | 'no-messages'
  | 'no-notifications'
  | 'no-documents'
  | 'no-team'
  | 'no-events';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
}

export interface EmptyStateProps {
  icon?: ReactNode;
  illustration?: EmptyStateIllustration;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const illustrationIcons: Record<EmptyStateIllustration, LucideIcon> = {
  'no-orders': Package,
  'no-results': Search,
  'no-data': FileText,
  error: AlertCircle,
  'no-messages': MessageSquare,
  'no-notifications': Bell,
  'no-documents': FolderOpen,
  'no-team': Users,
  'no-events': Calendar,
};

const illustrationColors: Record<EmptyStateIllustration, string> = {
  'no-orders': 'text-brand-500 bg-brand-50 dark:bg-brand-900/30',
  'no-results': 'text-gray-400 bg-gray-100 dark:bg-gray-800',
  'no-data': 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
  error: 'text-red-500 bg-red-50 dark:bg-red-900/30',
  'no-messages': 'text-purple-500 bg-purple-50 dark:bg-purple-900/30',
  'no-notifications': 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/30',
  'no-documents': 'text-green-500 bg-green-50 dark:bg-green-900/30',
  'no-team': 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30',
  'no-events': 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
};

const sizeStyles = {
  sm: {
    container: 'py-6 px-4',
    icon: 'h-10 w-10',
    iconWrapper: 'p-3',
    title: 'text-base',
    description: 'text-sm',
    buttonSize: 'sm' as const,
  },
  md: {
    container: 'py-10 px-6',
    icon: 'h-12 w-12',
    iconWrapper: 'p-4',
    title: 'text-lg',
    description: 'text-sm',
    buttonSize: 'md' as const,
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'h-16 w-16',
    iconWrapper: 'p-5',
    title: 'text-xl',
    description: 'text-base',
    buttonSize: 'md' as const,
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  illustration = 'no-data',
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = '',
}) => {
  const IconComponent = illustrationIcons[illustration];
  const colorClass = illustrationColors[illustration];
  const styles = sizeStyles[size];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${styles.container} ${className}`}
    >
      {/* Icon/Illustration */}
      <div className={`rounded-full mb-4 ${styles.iconWrapper} ${colorClass}`}>
        {icon || <IconComponent className={styles.icon} />}
      </div>

      {/* Title */}
      <h3
        className={`font-semibold text-gray-900 dark:text-white mb-2 ${styles.title}`}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={`text-gray-500 dark:text-gray-400 max-w-sm mb-6 ${styles.description}`}
        >
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button
              variant={action.variant || 'primary'}
              size={styles.buttonSize}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || 'secondary'}
              size={styles.buttonSize}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// Pre-configured Empty States for common scenarios

export interface NoOrdersEmptyStateProps {
  onCreateOrder?: () => void;
  className?: string;
}

export const NoOrdersEmptyState: React.FC<NoOrdersEmptyStateProps> = ({
  onCreateOrder,
  className,
}) => (
  <EmptyState
    illustration="no-orders"
    title="Nenhum pedido encontrado"
    description="Você ainda não possui pedidos. Comece adicionando seu primeiro pedido."
    action={
      onCreateOrder
        ? { label: 'Novo Pedido', onClick: onCreateOrder }
        : undefined
    }
    className={className}
  />
);

export interface NoResultsEmptyStateProps {
  searchTerm?: string;
  onClearSearch?: () => void;
  className?: string;
}

export const NoResultsEmptyState: React.FC<NoResultsEmptyStateProps> = ({
  searchTerm,
  onClearSearch,
  className,
}) => (
  <EmptyState
    illustration="no-results"
    title="Nenhum resultado encontrado"
    description={
      searchTerm
        ? `Não encontramos resultados para "${searchTerm}". Tente ajustar sua busca.`
        : 'Não encontramos resultados para sua busca. Tente outros termos.'
    }
    action={
      onClearSearch
        ? { label: 'Limpar busca', onClick: onClearSearch, variant: 'secondary' }
        : undefined
    }
    className={className}
  />
);

export interface NoMessagesEmptyStateProps {
  onStartChat?: () => void;
  className?: string;
}

export const NoMessagesEmptyState: React.FC<NoMessagesEmptyStateProps> = ({
  onStartChat,
  className,
}) => (
  <EmptyState
    illustration="no-messages"
    title="Nenhuma mensagem"
    description="Você ainda não possui conversas. Inicie uma nova conversa."
    action={
      onStartChat
        ? { label: 'Nova Conversa', onClick: onStartChat }
        : undefined
    }
    className={className}
  />
);

export interface NoNotificationsEmptyStateProps {
  className?: string;
}

export const NoNotificationsEmptyState: React.FC<NoNotificationsEmptyStateProps> = ({
  className,
}) => (
  <EmptyState
    illustration="no-notifications"
    title="Sem notificações"
    description="Você está em dia! Não há notificações pendentes."
    size="sm"
    className={className}
  />
);

export interface ErrorEmptyStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorEmptyState: React.FC<ErrorEmptyStateProps> = ({
  message,
  onRetry,
  className,
}) => (
  <EmptyState
    illustration="error"
    title="Algo deu errado"
    description={message || 'Ocorreu um erro ao carregar os dados. Por favor, tente novamente.'}
    action={
      onRetry
        ? { label: 'Tentar novamente', onClick: onRetry, variant: 'primary' }
        : undefined
    }
    className={className}
  />
);

export default EmptyState;
