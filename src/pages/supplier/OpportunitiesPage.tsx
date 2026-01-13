import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { suppliersService, ordersService, Order } from '../../services';
import { StatusBadge } from '../../components/shared/StatusBadge';
import {
    Package, Clock, DollarSign,
    Calendar, Building2, ChevronRight, Loader2,
    Target, CheckCircle, Eye
} from 'lucide-react';

const OpportunitiesPage: React.FC = () => {
    const [opportunities, setOpportunities] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);

    useEffect(() => {
        loadOpportunities();
    }, []);

    const loadOpportunities = async () => {
        try {
            const data = await suppliersService.getOpportunities();
            setOpportunities(data);
        } catch (error) {
            console.error('Error loading opportunities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAccept = async (orderId: string) => {
        try {
            setAcceptingId(orderId);
            await ordersService.accept(orderId);
            // Remove from list after accepting
            setOpportunities(prev => prev.filter(o => o.id !== orderId));
        } catch (error) {
            console.error('Error accepting order:', error);
        } finally {
            setAcceptingId(null);
        }
    };

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                        <Target className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Oportunidades
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            {opportunities.length} pedidos disponíveis para aceitar
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            ) : opportunities.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Nenhuma oportunidade disponível
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        Não há pedidos aguardando aceite no momento. Volte mais tarde para ver novas oportunidades de produção.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {opportunities.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
                        >
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                            {order.displayId}
                                        </span>
                                        <StatusBadge
                                            label={order.assignmentType === 'DIRECT' ? 'Direto' : 'Licitação'}
                                            variant={order.assignmentType === 'DIRECT' ? 'info' : 'purple'}
                                            size="sm"
                                        />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {order.productName}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {order.productType} • {order.productCategory || 'Geral'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Building2 className="w-4 h-4" />
                                    <span className="text-sm font-medium">{order.brand?.tradeName}</span>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                                <InfoCard
                                    icon={Package}
                                    label="Quantidade"
                                    value={`${order.quantity} pçs`}
                                />
                                <InfoCard
                                    icon={DollarSign}
                                    label="Valor Unitário"
                                    value={formatCurrency(Number(order.pricePerUnit))}
                                />
                                <InfoCard
                                    icon={DollarSign}
                                    label="Valor Total"
                                    value={formatCurrency(Number(order.totalValue))}
                                    highlight
                                />
                                <InfoCard
                                    icon={Calendar}
                                    label="Prazo de Entrega"
                                    value={formatDate(order.deliveryDeadline)}
                                />
                            </div>

                            {/* Description */}
                            {order.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    {order.description}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => handleAccept(order.id)}
                                    disabled={acceptingId === order.id}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {acceptingId === order.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-5 h-5" />
                                    )}
                                    Aceitar Pedido
                                </button>
                                <Link
                                    to={`/portal/pedidos/${order.id}`}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
                                >
                                    <Eye className="w-5 h-5" />
                                    Ver Detalhes
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface InfoCardProps {
    icon: React.FC<{ className?: string }>;
    label: string;
    value: string;
    highlight?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, label, value, highlight }) => (
    <div className={`p-3 rounded-xl ${highlight
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-gray-50 dark:bg-gray-900/50'
        }`}>
        <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${highlight ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        <p className={`font-semibold ${highlight
                ? 'text-green-700 dark:text-green-400'
                : 'text-gray-900 dark:text-white'
            }`}>
            {value}
        </p>
    </div>
);

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export default OpportunitiesPage;
