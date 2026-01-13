import api from './api';

export type DepositStatus = 'PREVISTO' | 'PROCESSANDO' | 'DEPOSITADO' | 'FALHOU' | 'ESTORNADO';

export interface Deposit {
    id: string;
    periodStart: string;
    periodEnd: string;
    expectedDate: string;
    paidAt?: string;
    grossAmount: number;
    feeAmount: number;
    adjustments: number;
    netAmount: number;
    status: DepositStatus;
    notes?: string;
}

export interface DepositItem {
    id: string;
    orderId: string;
    orderDisplayId: string;
    productName: string;
    brand: string;
    amount: number;
}

export interface DepositDetail extends Deposit {
    items: DepositItem[];
}

// Mock data
const mockDeposits: Deposit[] = [
    {
        id: '1',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-07',
        expectedDate: '2026-01-10',
        paidAt: '2026-01-10',
        grossAmount: 15000,
        feeAmount: 450,
        adjustments: 0,
        netAmount: 14550,
        status: 'DEPOSITADO',
    },
    {
        id: '2',
        periodStart: '2026-01-08',
        periodEnd: '2026-01-14',
        expectedDate: '2026-01-17',
        grossAmount: 22000,
        feeAmount: 660,
        adjustments: -500,
        netAmount: 20840,
        status: 'PROCESSANDO',
    },
    {
        id: '3',
        periodStart: '2026-01-15',
        periodEnd: '2026-01-21',
        expectedDate: '2026-01-24',
        grossAmount: 18500,
        feeAmount: 555,
        adjustments: 0,
        netAmount: 17945,
        status: 'PREVISTO',
    },
];

const mockDepositItems: DepositItem[] = [
    { id: '1', orderId: 'o1', orderDisplayId: 'TX-20260105-0001', productName: 'Camiseta Infantil', brand: 'Marca Fashion', amount: 5000 },
    { id: '2', orderId: 'o2', orderDisplayId: 'TX-20260106-0002', productName: 'Vestido Adulto', brand: 'TrendWear', amount: 7500 },
    { id: '3', orderId: 'o3', orderDisplayId: 'TX-20260107-0003', productName: 'Calça Jeans', brand: 'StyleCo', amount: 2500 },
];

export const depositsService = {
    async getDeposits(filters?: { status?: DepositStatus; startDate?: string; endDate?: string }): Promise<Deposit[]> {
        try {
            const response = await api.get<Deposit[]>('/portal/finance/deposits', { params: filters });
            return response.data;
        } catch {
            // Return mock data
            let result = [...mockDeposits];
            if (filters?.status) {
                result = result.filter(d => d.status === filters.status);
            }
            return result;
        }
    },

    async getDepositById(id: string): Promise<DepositDetail> {
        try {
            const response = await api.get<DepositDetail>(`/portal/finance/deposits/${id}`);
            return response.data;
        } catch {
            const deposit = mockDeposits.find(d => d.id === id);
            if (!deposit) throw new Error('Deposit not found');
            return { ...deposit, items: mockDepositItems };
        }
    },
};

export default depositsService;
