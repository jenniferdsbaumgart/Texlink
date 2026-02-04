import React, { useState } from 'react';
import {
    Building2,
    Mail,
    Phone,
    MessageCircle,
    RefreshCw,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import type { SupplierInvitation } from '../../services/suppliers.service';

interface SupplierInvitationCardProps {
    invitation: SupplierInvitation;
    onResend: () => void;
    isResending?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
    INVITATION_PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    INVITATION_SENT: { label: 'Enviado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Mail },
    INVITATION_OPENED: { label: 'Aberto', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Mail },
    INVITATION_EXPIRED: { label: 'Expirado', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: AlertCircle },
    ONBOARDING_STARTED: { label: 'Cadastrando', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Loader2 },
    ONBOARDING_IN_PROGRESS: { label: 'Em Progresso', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: Loader2 },
    CONTRACT_PENDING: { label: 'Contrato Pendente', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Clock },
    CONTRACT_SIGNED: { label: 'Contrato Assinado', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400', icon: CheckCircle },
    ACTIVE: { label: 'Ativo', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
};

const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatRelativeTime = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expirado';
    if (diffDays === 0) return 'Expira hoje';
    if (diffDays === 1) return 'Expira amanhã';
    return `Expira em ${diffDays} dias`;
};

export const SupplierInvitationCard: React.FC<SupplierInvitationCardProps> = ({
    invitation,
    onResend,
    isResending = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const status = statusConfig[invitation.status] || statusConfig.INVITATION_PENDING;
    const StatusIcon = status.icon;

    const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date();

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Main Content */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                    {/* Left: Company Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
                            <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {invitation.tradeName || invitation.legalName || 'Empresa sem nome'}
                                </h3>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {status.label}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {invitation.cnpj}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {invitation.contactEmail}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {invitation.contactPhone}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {invitation.canResend && (
                            <button
                                onClick={onResend}
                                disabled={isResending}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 disabled:opacity-50 transition-colors"
                            >
                                {isResending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-3.5 w-3.5" />
                                )}
                                Reenviar
                            </button>
                        )}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Expiry Warning */}
                {invitation.expiresAt && (
                    <div className={`mt-3 flex items-center gap-1.5 text-xs ${isExpired
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400'
                        }`}>
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeTime(invitation.expiresAt)}
                    </div>
                )}
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-0">
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Contato</p>
                            <p className="font-medium text-gray-900 dark:text-white">{invitation.contactName}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Enviado em</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatDate(invitation.createdAt)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Expira em</p>
                            <p className="font-medium text-gray-900 dark:text-white">{formatDate(invitation.expiresAt)}</p>
                        </div>
                        {invitation.internalCode && (
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Código Interno</p>
                                <p className="font-medium text-gray-900 dark:text-white">{invitation.internalCode}</p>
                            </div>
                        )}
                        {invitation.contactWhatsapp && (
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">WhatsApp</p>
                                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                    <MessageCircle className="h-3 w-3 text-green-500" />
                                    {invitation.contactWhatsapp}
                                </p>
                            </div>
                        )}
                        {invitation.lastInvitationSentAt && (
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Último Envio</p>
                                <p className="font-medium text-gray-900 dark:text-white">{formatDate(invitation.lastInvitationSentAt)}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierInvitationCard;
