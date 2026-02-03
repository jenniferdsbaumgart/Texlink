import api from './api';

// Types
export interface PortalSummary {
    activeOrders: number;
    pendingAccept: number;
    upcomingDeliveries: number;
    pendingDocuments: number;
    bankDataComplete: boolean;
    alerts: PortalAlert[];
}

export interface PortalAlert {
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message?: string;
    actionLabel?: string;
    actionPath?: string;
}

export interface PerformanceData {
    completedOrders: number;
    acceptanceRate: number;
    avgLeadTime: number;
    cancellationRate: number;
    totalRevenue: number;
    chartData: { date: string; value: number }[];
    byStatus: { status: string; count: number; value: number }[];
    byBrand: { brand: string; count: number; value: number }[];
}

export interface RevenueHistoryItem {
    month: string;
    revenue: number;
    orders: number;
}

export interface ReportFilters {
    startDate?: string;
    endDate?: string;
    status?: string;
    brandId?: string;
}

export interface ReportData<T = unknown> {
    summary: Record<string, number | string>;
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}

// Mock data generator (will be replaced by real API)
const generateMockSummary = (): PortalSummary => ({
    activeOrders: 12,
    pendingAccept: 3,
    upcomingDeliveries: 5,
    pendingDocuments: 1,
    bankDataComplete: false,
    alerts: [
        {
            id: '1',
            type: 'warning',
            title: 'Complete seus dados bancários',
            message: 'Para receber repasses, preencha suas informações bancárias.',
            actionLabel: 'Atualizar dados',
            actionPath: '/portal/configuracoes',
        },
        {
            id: '2',
            type: 'info',
            title: '3 pedidos aguardando aceite',
            message: 'Você tem pedidos pendentes de confirmação.',
            actionLabel: 'Ver pedidos',
            actionPath: '/portal/pedidos',
        },
    ],
});

const generateMockPerformance = (): PerformanceData => ({
    completedOrders: 45,
    acceptanceRate: 92,
    avgLeadTime: 7.2,
    cancellationRate: 3.5,
    totalRevenue: 125000,
    chartData: [
        { date: '2026-01-01', value: 15000 },
        { date: '2026-01-08', value: 22000 },
        { date: '2026-01-15', value: 18000 },
        { date: '2026-01-22', value: 28000 },
        { date: '2026-01-29', value: 32000 },
    ],
    byStatus: [
        { status: 'Concluído', count: 45, value: 95000 },
        { status: 'Em Produção', count: 8, value: 20000 },
        { status: 'Aguardando', count: 4, value: 10000 },
    ],
    byBrand: [
        { brand: 'Marca Fashion', count: 20, value: 50000 },
        { brand: 'TrendWear', count: 15, value: 40000 },
        { brand: 'StyleCo', count: 10, value: 35000 },
    ],
});

export const portalService = {
    async getSummary(): Promise<PortalSummary> {
        try {
            const response = await api.get<PortalSummary>('/portal/summary');
            return response.data;
        } catch {
            // Return mock data if API not available
            return generateMockSummary();
        }
    },

    async getPerformance(startDate?: string, endDate?: string): Promise<PerformanceData> {
        try {
            const response = await api.get<PerformanceData>('/portal/performance', {
                params: { start: startDate, end: endDate },
            });
            return response.data;
        } catch {
            return generateMockPerformance();
        }
    },

    async getQualityReport(filters: ReportFilters): Promise<ReportData> {
        try {
            const response = await api.get('/portal/reports/quality', { params: filters });
            return response.data;
        } catch {
            return {
                summary: { totalOrders: 100, onTimeRate: 95, qualityScore: 4.5 },
                data: [],
                total: 0,
                page: 1,
                pageSize: 20,
            };
        }
    },

    async getSalesReport(filters: ReportFilters): Promise<ReportData> {
        try {
            const response = await api.get('/portal/reports/sales', { params: filters });
            return response.data;
        } catch {
            return {
                summary: { totalSales: 125000, orderCount: 45, avgTicket: 2777 },
                data: [],
                total: 0,
                page: 1,
                pageSize: 20,
            };
        }
    },

    async getCancellationsReport(filters: ReportFilters): Promise<ReportData> {
        try {
            const response = await api.get('/portal/reports/cancellations', { params: filters });
            return response.data;
        } catch {
            return {
                summary: {
                    totalCancelled: 5,
                    cancellationRate: 3.5,
                    topReason: 'Prazo inviável',
                },
                data: [
                    { id: '1', orderId: 'TX-20260110-0001', date: '2026-01-10', brand: 'Marca A', reason: 'PRAZO_INVIAVEL', value: 2500 },
                    { id: '2', orderId: 'TX-20260108-0002', date: '2026-01-08', brand: 'Marca B', reason: 'FALTA_MATERIAL', value: 1800 },
                ],
                total: 2,
                page: 1,
                pageSize: 20,
            };
        }
    },

    async dismissAlert(alertId: string): Promise<void> {
        try {
            await api.post(`/portal/alerts/${alertId}/dismiss`);
        } catch {
            // Silently fail in mock mode
        }
    },

    async getRevenueHistory(months = 6): Promise<RevenueHistoryItem[]> {
        try {
            const response = await api.get<RevenueHistoryItem[]>('/portal/revenue-history', {
                params: { months },
            });
            return response.data;
        } catch {
            // Return empty array - charts will show "no data" state
            return [];
        }
    },
};

export default portalService;
