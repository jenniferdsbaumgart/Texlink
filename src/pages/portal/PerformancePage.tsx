import React, { useState, useEffect } from 'react';
import { portalService, PerformanceData } from '../../services/portal.service';
import { MetricCard } from '../../components/shared/MetricCard';
import {
    CheckCircle,
    TrendingUp,
    Clock,
    XCircle,
    DollarSign,
    Calendar,
    Download,
    Loader2,
    Filter
} from 'lucide-react';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

type PeriodPreset = '7' | '30' | '90' | 'custom';

const PerformancePage: React.FC = () => {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeTab, setActiveTab] = useState<'byStatus' | 'byBrand'>('byStatus');

    useEffect(() => {
        loadData();
    }, [periodPreset, startDate, endDate]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const result = await portalService.getPerformance(startDate, endDate);
            setData(result);
        } catch (error) {
            console.error('Error loading performance:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePeriodChange = (preset: PeriodPreset) => {
        setPeriodPreset(preset);
        if (preset !== 'custom') {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - parseInt(preset));
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(end.toISOString().split('T')[0]);
        }
    };

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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Desempenho</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Acompanhe os principais indicadores da sua operação
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Download className="h-4 w-4" />
                    Exportar
                </button>
            </div>

            {/* Period Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(['7', '30', '90'] as PeriodPreset[]).map((preset) => (
                            <button
                                key={preset}
                                onClick={() => handlePeriodChange(preset)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${periodPreset === preset
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {preset} dias
                            </button>
                        ))}
                        <button
                            onClick={() => handlePeriodChange('custom')}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${periodPreset === 'custom'
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            Personalizado
                        </button>
                    </div>
                    {periodPreset === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            />
                            <span className="text-gray-500">até</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <MetricCard
                    title="Pedidos Concluídos"
                    value={data?.completedOrders || 0}
                    icon={CheckCircle}
                    iconColor="green"
                />
                <MetricCard
                    title="Taxa de Aceitação"
                    value={`${data?.acceptanceRate || 0}%`}
                    icon={TrendingUp}
                    iconColor="blue"
                />
                <MetricCard
                    title="Lead Time Médio"
                    value={`${data?.avgLeadTime || 0} dias`}
                    icon={Clock}
                    iconColor="purple"
                />
                <MetricCard
                    title="Taxa de Cancelamento"
                    value={`${data?.cancellationRate || 0}%`}
                    icon={XCircle}
                    iconColor={data?.cancellationRate && data.cancellationRate > 5 ? 'red' : 'green'}
                />
                <MetricCard
                    title="Total Faturado"
                    value={formatCurrency(data?.totalRevenue || 0)}
                    icon={DollarSign}
                    iconColor="brand"
                />
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Evolução do Faturamento
                </h2>
                <div className="h-64 flex items-end justify-between gap-2">
                    {data?.chartData?.map((point, index) => {
                        const maxValue = Math.max(...(data.chartData?.map(p => p.value) || [1]));
                        const height = (point.value / maxValue) * 100;
                        return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-gradient-to-t from-brand-500 to-brand-400 rounded-t"
                                    style={{ height: `${Math.max(height, 5)}%` }}
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('byStatus')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'byStatus'
                                    ? 'text-brand-600 border-b-2 border-brand-600 dark:text-brand-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Por Status
                        </button>
                        <button
                            onClick={() => setActiveTab('byBrand')}
                            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'byBrand'
                                    ? 'text-brand-600 border-b-2 border-brand-600 dark:text-brand-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Por Marca
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {activeTab === 'byStatus' ? 'Status' : 'Marca'}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Pedidos
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Valor Total
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {(activeTab === 'byStatus' ? data?.byStatus : data?.byBrand)?.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                        {activeTab === 'byStatus' ? row.status : (row as any).brand}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 text-right">
                                        {row.count}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white text-right">
                                        {formatCurrency(row.value)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PerformancePage;
