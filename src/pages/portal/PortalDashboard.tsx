import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { portalService, PortalSummary } from '../../services/portal.service';
import { onboardingService, SupplierProfile } from '../../services/onboarding.service';
import { MetricCard } from '../../components/shared/MetricCard';
import { AlertBanner } from '../../components/shared/AlertBanner';
import {
    Package,
    Clock,
    Truck,
    FileWarning,
    ArrowRight,
    BarChart3,
    DollarSign,
    Wallet,
    Loader2,
    CheckCircle,
    CheckCircle2,
    Circle
} from 'lucide-react';

const PortalDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<PortalSummary | null>(null);
    const [profile, setProfile] = useState<SupplierProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        try {
            setIsLoading(true);
            const [summaryData, profileData] = await Promise.all([
                portalService.getSummary(),
                onboardingService.getProfile().catch(() => null),
            ]);
            setSummary(summaryData);
            setProfile(profileData);
        } catch (error) {
            console.error('Error loading portal data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismissAlert = (alertId: string) => {
        setDismissedAlerts(prev => [...prev, alertId]);
        portalService.dismissAlert(alertId);
    };

    const visibleAlerts = summary?.alerts.filter(a => !dismissedAlerts.includes(a.id)) || [];

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Olá, {user?.name?.split(' ')[0] || 'Parceiro'}! 👋
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Aqui está o resumo da sua operação
                </p>
            </div>

            {/* Onboarding Progress Card */}
            {profile && !profile.onboardingComplete && (
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 mb-8 text-white">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">Complete seu cadastro</h3>
                            <p className="text-amber-100 text-sm mb-4">
                                Finalize as etapas para receber pedidos na plataforma.
                            </p>
                            {/* Progress Steps */}
                            <div className="flex items-center gap-3 mb-4">
                                {[1, 2, 3].map((step) => (
                                    <div key={step} className="flex items-center gap-2">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center ${step < (profile.onboardingPhase || 1) + 1
                                                ? 'bg-white text-amber-600'
                                                : step === (profile.onboardingPhase || 1) + 1
                                                    ? 'bg-white/30 text-white ring-2 ring-white'
                                                    : 'bg-white/20 text-white/60'
                                                }`}
                                        >
                                            {step < (profile.onboardingPhase || 1) + 1 ? (
                                                <CheckCircle2 className="w-5 h-5" />
                                            ) : (
                                                <span className="text-sm font-bold">{step}</span>
                                            )}
                                        </div>
                                        {step < 3 && (
                                            <div className={`w-8 h-0.5 ${step < (profile.onboardingPhase || 1) + 1 ? 'bg-white' : 'bg-white/30'}`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Link
                                    to={`/onboarding/phase${Math.min((profile.onboardingPhase || 1) + 1, 3)}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-amber-600 rounded-lg font-medium hover:bg-amber-50 transition-colors"
                                >
                                    Continuar cadastro
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <button
                                    onClick={async () => {
                                        try {
                                            await onboardingService.completeOnboarding();
                                            setProfile(prev => prev ? { ...prev, onboardingComplete: true } : null);
                                        } catch (e) {
                                            console.error('Error completing onboarding:', e);
                                        }
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-colors"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    Já completei
                                </button>
                            </div>
                        </div>
                        <div className="text-amber-200 text-5xl font-bold opacity-30">
                            {profile.onboardingPhase || 1}/3
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts */}
            {visibleAlerts.length > 0 && (
                <div className="space-y-3 mb-8">
                    {visibleAlerts.map(alert => (
                        <AlertBanner
                            key={alert.id}
                            type={alert.type}
                            title={alert.title}
                            message={alert.message}
                            actionLabel={alert.actionLabel}
                            onAction={() => alert.actionPath && navigate(alert.actionPath)}
                            onDismiss={() => handleDismissAlert(alert.id)}
                        />
                    ))}
                </div>
            )}

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard
                    title="Pedidos Ativos"
                    value={summary?.activeOrders || 0}
                    icon={Package}
                    iconColor="brand"
                    onClick={() => navigate('/portal/pedidos')}
                />
                <MetricCard
                    title="Aguardando Aceite"
                    value={summary?.pendingAccept || 0}
                    icon={Clock}
                    iconColor="yellow"
                    onClick={() => navigate('/portal/pedidos?status=pending')}
                />
                <MetricCard
                    title="Entregas Próximas"
                    value={summary?.upcomingDeliveries || 0}
                    subtitle="Próximos 7 dias"
                    icon={Truck}
                    iconColor="blue"
                    onClick={() => navigate('/portal/pedidos?status=delivery')}
                />
                <MetricCard
                    title="Documentos Pendentes"
                    value={summary?.pendingDocuments || 0}
                    icon={summary?.pendingDocuments ? FileWarning : CheckCircle}
                    iconColor={summary?.pendingDocuments ? 'red' : 'green'}
                />
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Ações Rápidas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link
                        to="/portal/pedidos"
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                                <Package className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">Ver Pedidos</span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                    </Link>

                    <Link
                        to="/portal/financeiro/dados-bancarios"
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">Dados Bancários</span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                    </Link>

                    <Link
                        to="/portal/financeiro/depositos"
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">Ver Depósitos</span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                    </Link>

                    <Link
                        to="/portal/desempenho"
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">Ver Desempenho</span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-brand-500 transition-colors" />
                    </Link>
                </div>
            </div>

            {/* Bank Data Status */}
            {!summary?.bankDataComplete && (
                <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Configure seus dados bancários</h3>
                            <p className="text-brand-100 text-sm mb-4">
                                Para receber os repasses dos pedidos, você precisa cadastrar suas informações bancárias.
                            </p>
                            <Link
                                to="/portal/financeiro/dados-bancarios"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-brand-600 rounded-lg font-medium hover:bg-brand-50 transition-colors"
                            >
                                Configurar agora
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <Wallet className="h-16 w-16 text-brand-300 opacity-50" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortalDashboard;
