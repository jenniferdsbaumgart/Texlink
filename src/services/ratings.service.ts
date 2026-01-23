import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';

export interface Rating {
    id: string;
    orderId: string;
    fromCompanyId: string;
    toCompanyId: string;
    score: number;
    comment?: string;
    createdAt: string;
    fromCompany?: {
        id: string;
        tradeName: string;
    };
    toCompany?: {
        id: string;
        tradeName: string;
    };
}

export interface PendingRating {
    orderId: string;
    orderDisplayId: string;
    partnerCompanyId: string;
    partnerName: string;
    partnerImage?: string;
    completedAt: string;
}

export interface CreateRatingDto {
    orderId: string;
    score: number;
    comment?: string;
}

// Mock ratings data
const mockRatings: Rating[] = [
    {
        id: 'rating-001',
        orderId: 'order-005',
        fromCompanyId: 'company-brand-001',
        toCompanyId: 'supplier-001',
        score: 5,
        comment: 'Excelente qualidade e pontualidade!',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        fromCompany: { id: 'company-brand-001', tradeName: 'Fashion Style Ltda' },
        toCompany: { id: 'supplier-001', tradeName: 'Confecções Silva' }
    },
    {
        id: 'rating-002',
        orderId: 'order-004',
        fromCompanyId: 'company-brand-001',
        toCompanyId: 'supplier-001',
        score: 4,
        comment: 'Bom trabalho, pequeno atraso na entrega.',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        fromCompany: { id: 'company-brand-001', tradeName: 'Fashion Style Ltda' },
        toCompany: { id: 'supplier-001', tradeName: 'Confecções Silva' }
    }
];

export const ratingsService = {
    async submitRating(orderId: string, data: { score: number; comment?: string }): Promise<Rating> {
        if (MOCK_MODE) {
            await simulateDelay(600);
            const storedUser = localStorage.getItem('user');
            const user = storedUser ? JSON.parse(storedUser) : { id: 'demo-user' };

            const newRating: Rating = {
                id: `rating-${Date.now()}`,
                orderId,
                fromCompanyId: user.role === 'BRAND' ? 'company-brand-001' : 'supplier-001',
                toCompanyId: user.role === 'BRAND' ? 'supplier-001' : 'company-brand-001',
                score: data.score,
                comment: data.comment,
                createdAt: new Date().toISOString()
            };
            mockRatings.push(newRating);
            return newRating;
        }

        const response = await api.post<Rating>(`/ratings/orders/${orderId}`, data);
        return response.data;
    },

    async getPendingRatings(): Promise<PendingRating[]> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            // Return empty for demo - no pending ratings
            return [];
        }

        const response = await api.get<PendingRating[]>('/ratings/pending');
        return response.data;
    },

    async getCompanyRatings(companyId: string): Promise<Rating[]> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return mockRatings.filter(r => r.toCompanyId === companyId);
        }

        const response = await api.get<Rating[]>(`/ratings/company/${companyId}`);
        return response.data;
    },

    async getMyRatings(): Promise<Rating[]> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return mockRatings;
        }

        const response = await api.get<Rating[]>('/ratings/received');
        return response.data;
    },
};
