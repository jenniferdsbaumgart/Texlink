import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { depositsService, DepositDetail, DepositStatus } from '../../../services/deposits.service';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import {
    ArrowLeft,
    DollarSign,
    Calendar,
    Loader2,
    FileText,
    Package
} from 'lucide-react';

const STATUS_CONFIG: Record<DepositStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
    PREVISTO: { label: 'Previsto', variant: 'info' },
    PROCESSANDO: { label: 'Processando', variant: 'warning' },
    DEPOSITADO: { label: 'Depositado', variant: 'success' },
    FALHOU: { label: 'Falhou', variant: 'error' },
    ESTORNADO: { label: 'Estornado', variant: 'error' },
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR');

const DepositDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [deposit, setDeposit] = useState<DepositDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadDeposit(id);
        }
    }, [id]);

    const loadDeposit = async (depositId: string) => {
        try {
            setIsLoading(true);
            const data = await depositsService.getDepositById(depositId);
            setDeposit(data);
        } catch (error) {
            console.error('Error loading deposit:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (!deposit) {
        return (
            <div className="p-6 lg:p-8 max-w-7xl mx-auto text-center">
                <p className="text-gray-500 dark:text-gray-400">Depósito não encontrado</p>
                <Link to="/portal/financeiro/depositos" className="text-brand-600 hover:underline mt-4 inline-block">
                    Voltar para depósitos
                </Link>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    to="/portal/financeiro/depositos"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Detalhes do Depósito
                        </h1>
                        <StatusBadge
                            label={STATUS_CONFIG[deposit.status].label}
                            variant={STATUS_CONFIG[deposit.status].variant}
                        />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Período: {formatDate(deposit.periodStart)} - {formatDate(deposit.periodEnd)}
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Valor Bruto</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(deposit.grossAmount)}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Taxas/Ajustes</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        -{formatCurrency(deposit.feeAmount + Math.abs(deposit.adjustments))}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Valor Líquido</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(deposit.netAmount)}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {deposit.paidAt ? 'Data do Depósito' : 'Previsão'}
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatDate(deposit.paidAt || deposit.expectedDate)}
                    </p>
                </div>
            </div>

            {/* Order Composition */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Composição por Pedidos
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {deposit.items.length} pedidos neste repasse
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Pedido
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Produto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Marca
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Valor
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {deposit.items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 text-sm font-medium text-brand-600 dark:text-brand-400">
                                        {item.orderDisplayId}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                        {item.productName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {item.brand}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white text-right">
                                        {formatCurrency(item.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                    Total
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right">
                                    {formatCurrency(deposit.grossAmount)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Adjustments (if any) */}
            {deposit.adjustments !== 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <FileText className="h-5 w-5" />
                        Ajustes
                    </h2>
                    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            {deposit.adjustments < 0 ? 'Estorno/Correção' : 'Crédito adicional'}
                        </span>
                        <span className={`font-semibold ${deposit.adjustments < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {formatCurrency(deposit.adjustments)}
                        </span>
                    </div>
                    {deposit.notes && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                            Observação: {deposit.notes}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default DepositDetailPage;
