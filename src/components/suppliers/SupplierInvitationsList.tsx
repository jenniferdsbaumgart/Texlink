import React, { useEffect, useState } from 'react';
import { Loader2, Mail, RefreshCw, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { suppliersService, type SupplierInvitation } from '../../services/suppliers.service';
import SupplierInvitationCard from './SupplierInvitationCard';

interface SupplierInvitationsListProps {
    onInvitationResent?: () => void;
}

const SupplierInvitationsList: React.FC<SupplierInvitationsListProps> = ({
    onInvitationResent,
}) => {
    const [invitations, setInvitations] = useState<SupplierInvitation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resendingId, setResendingId] = useState<string | null>(null);

    useEffect(() => {
        loadInvitations();
    }, []);

    const loadInvitations = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await suppliersService.getInvitations();
            setInvitations(data);
        } catch (err) {
            console.error('Error loading invitations:', err);
            setError('Erro ao carregar convites');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async (invitationId: string) => {
        try {
            setResendingId(invitationId);
            await suppliersService.resendInvitation(invitationId);
            await loadInvitations();
            onInvitationResent?.();
        } catch (err) {
            console.error('Error resending invitation:', err);
        } finally {
            setResendingId(null);
        }
    };

    // Group invitations by status
    const pending = invitations.filter(
        (inv) => inv.status === 'INVITATION_SENT' || inv.status === 'INVITATION_PENDING'
    );
    const expired = invitations.filter((inv) => inv.status === 'INVITATION_EXPIRED');
    const inProgress = invitations.filter(
        (inv) =>
            inv.status === 'ONBOARDING_STARTED' ||
            inv.status === 'ONBOARDING_IN_PROGRESS' ||
            inv.status === 'INVITATION_OPENED'
    );
    const completed = invitations.filter(
        (inv) =>
            inv.status === 'ACTIVE' ||
            inv.status === 'CONTRACT_SIGNED' ||
            inv.status === 'CONTRACT_PENDING'
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <p className="text-red-700 dark:text-red-300">{error}</p>
                <button
                    onClick={loadInvitations}
                    className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors inline-flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (invitations.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Nenhum convite enviado
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    Convide novos fornecedores para fazer parte da sua rede de facções credenciadas.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {pending.length}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pendentes</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                            <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {inProgress.length}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Em Onboarding</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {expired.length}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Expirados</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {completed.length}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Concluídos</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Invitations */}
            {pending.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Aguardando Resposta ({pending.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pending.map((invitation) => (
                            <SupplierInvitationCard
                                key={invitation.id}
                                invitation={invitation}
                                onResend={() => handleResend(invitation.id)}
                                isResending={resendingId === invitation.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* In Progress */}
            {inProgress.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-amber-500" />
                        Em Onboarding ({inProgress.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {inProgress.map((invitation) => (
                            <SupplierInvitationCard
                                key={invitation.id}
                                invitation={invitation}
                                onResend={() => handleResend(invitation.id)}
                                isResending={resendingId === invitation.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Expired Invitations */}
            {expired.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-500" />
                        Expirados ({expired.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {expired.map((invitation) => (
                            <SupplierInvitationCard
                                key={invitation.id}
                                invitation={invitation}
                                onResend={() => handleResend(invitation.id)}
                                isResending={resendingId === invitation.id}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Concluídos ({completed.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {completed.map((invitation) => (
                            <SupplierInvitationCard
                                key={invitation.id}
                                invitation={invitation}
                                onResend={() => handleResend(invitation.id)}
                                isResending={resendingId === invitation.id}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierInvitationsList;
