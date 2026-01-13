import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { depositsService, Deposit, DepositStatus } from '../../../services/deposits.service';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import {
    DollarSign,
    Calendar,
    Filter,
    Loader2,
    ChevronRight,
    Download
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

const formatPeriod = (start: string, end: string) =>
    `${formatDate(start)} - ${formatDate(end)}`;

const DepositsPage: React.FC = () => {
    const navigate = useNavigate();
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<DepositStatus | ''>('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        loadDeposits();
    }, [statusFilter]);

    const loadDeposits = async () => {
        try {
            setIsLoading(true);
            const data = await depositsService.getDeposits(
                statusFilter ? { status: statusFilter } : undefined
            );
            setDeposits(data);
        } catch (error) {
            console.error('Error loading deposits:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const totals = deposits.reduce(
        (acc, d) => ({
            gross: acc.gross + d.grossAmount,
            net: acc.net + d.netAmount,
        }),
        { gross: 0, net: 0 }
    );

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Depósitos</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Acompanhe seus repasses e pagamentos
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Download className="h-4 w-4" />
                    Exportar
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Bruto</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.gross)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Líquido</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totals.net)}</p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setStatusFilter('')}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${statusFilter === ''
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            Todos
                        </button>
                        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status as DepositStatus)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${statusFilter === status
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {config.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Deposits List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {deposits.length === 0 ? (
                    <div className="p-8 text-center">
                        <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400">Nenhum depósito encontrado</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Período
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Data Prevista
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Data Paga
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Bruto
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Taxas
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Líquido
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {deposits.map((deposit) => (
                                    <tr
                                        key={deposit.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                        onClick={() => navigate(`/portal/financeiro/depositos/${deposit.id}`)}
                                    >
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                                            {formatPeriod(deposit.periodStart, deposit.periodEnd)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {formatDate(deposit.expectedDate)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {deposit.paidAt ? formatDate(deposit.paidAt) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white text-right whitespace-nowrap">
                                            {formatCurrency(deposit.grossAmount)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400 text-right whitespace-nowrap">
                                            -{formatCurrency(deposit.feeAmount)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-green-600 dark:text-green-400 text-right whitespace-nowrap">
                                            {formatCurrency(deposit.netAmount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge
                                                label={STATUS_CONFIG[deposit.status].label}
                                                variant={STATUS_CONFIG[deposit.status].variant}
                                                size="sm"
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ChevronRight className="h-5 w-5 text-gray-400" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DepositsPage;
