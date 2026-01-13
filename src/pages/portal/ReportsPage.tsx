import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, BarChart3, XCircle, ChevronRight } from 'lucide-react';

interface ReportCard {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    path: string;
}

const reports: ReportCard[] = [
    {
        id: 'qualidade',
        title: 'Qualidade da Operação',
        description: 'Centralização dos dados mais relevantes sobre a eficiência operacional da loja e principais métricas.',
        icon: <FileText className="h-8 w-8" />,
        path: '/portal/relatorios?tipo=qualidade',
    },
    {
        id: 'vendas',
        title: 'Vendas',
        description: 'Pedidos negociados com clientes, destacando pedidos aceitos e cancelamentos.',
        icon: <BarChart3 className="h-8 w-8" />,
        path: '/portal/relatorios?tipo=vendas',
    },
    {
        id: 'cancelamentos',
        title: 'Cancelamentos',
        description: 'Detalhe de cancelamentos (totais e parciais), com motivos, impacto no faturamento e perda financeira.',
        icon: <XCircle className="h-8 w-8" />,
        path: '/portal/relatorios?tipo=cancelamentos',
    },
];

const ReportsPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const selectedType = searchParams.get('tipo');

    // If no type selected, show report cards
    if (!selectedType) {
        return (
            <div className="p-6 lg:p-8 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gere relatórios para acompanhar o desempenho das operações
                    </p>
                </div>

                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Operação</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reports.map((report) => (
                            <Link
                                key={report.id}
                                to={report.path}
                                className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all"
                            >
                                <div className="text-gray-400 dark:text-gray-500 mb-4 group-hover:text-brand-500 transition-colors">
                                    {report.icon}
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                                    {report.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                                    {report.description}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Render specific report based on type
    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <Link to="/portal/relatorios" className="hover:text-brand-500">
                    Relatórios
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 dark:text-white font-medium capitalize">
                    {selectedType === 'qualidade' ? 'Qualidade da Operação' : selectedType}
                </span>
            </div>

            {selectedType === 'qualidade' && <QualityReport />}
            {selectedType === 'vendas' && <SalesReport />}
            {selectedType === 'cancelamentos' && <CancellationsReport />}
        </div>
    );
};

// Quality Report Component
const QualityReport: React.FC = () => {
    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Qualidade da Operação
            </h1>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total de Pedidos</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">100</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Taxa de Entrega no Prazo</p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">95%</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Nota Média</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">4.5 ⭐</p>
                    </div>
                </div>
                <p className="text-center text-gray-500 dark:text-gray-400">
                    Dados detalhados serão carregados do backend.
                </p>
            </div>
        </div>
    );
};

// Sales Report Component
const SalesReport: React.FC = () => {
    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Relatório de Vendas
            </h1>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total de Vendas</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ 125.000</p>
                    </div>
                    <div className="text-center p-4 bg-brand-50 dark:bg-brand-900/20 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pedidos</p>
                        <p className="text-3xl font-bold text-brand-600 dark:text-brand-400">45</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Ticket Médio</p>
                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">R$ 2.777</p>
                    </div>
                </div>
                <p className="text-center text-gray-500 dark:text-gray-400">
                    Dados detalhados serão carregados do backend.
                </p>
            </div>
        </div>
    );
};

// Cancellations Report Component
const CancellationsReport: React.FC = () => {
    const mockData = [
        { id: '1', orderId: 'TX-20260110-0001', date: '10/01/2026', brand: 'Marca Fashion', reason: 'Prazo inviável', value: 2500 },
        { id: '2', orderId: 'TX-20260108-0002', date: '08/01/2026', brand: 'TrendWear', reason: 'Falta de material', value: 1800 },
        { id: '3', orderId: 'TX-20260105-0003', date: '05/01/2026', brand: 'StyleCo', reason: 'Capacidade excedida', value: 3200 },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Relatório de Cancelamentos
            </h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Cancelados</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">5</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">% sobre Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">3.5%</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Principal Motivo</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">Prazo inviável</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Pedido
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Data
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Marca
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Motivo
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Valor
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {mockData.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 text-sm font-medium text-brand-600 dark:text-brand-400">
                                        {row.orderId}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                        {row.date}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                        {row.brand}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="px-2 py-1 text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                                            {row.reason}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white text-right">
                                        R$ {row.value.toLocaleString('pt-BR')}
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

export default ReportsPage;
