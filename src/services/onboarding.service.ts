import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';

export interface SupplierProfile {
    id: string;
    companyId: string;
    onboardingPhase: number; // 1, 2, or 3
    onboardingComplete: boolean;
    businessQualification?: {
        interesse?: string;
        faturamentoDesejado?: number;
        maturidadeGestao?: string;
        qtdColaboradores?: number;
        tempoMercado?: string;
    };
    productTypes?: string[];
    specialties?: string[];
    monthlyCapacity?: number;
    currentOccupancy?: number;
}

export interface Phase2Data {
    interesse?: string;
    faturamentoDesejado?: number;
    maturidadeGestao?: string;
    qtdColaboradores?: number;
    tempoMercado?: string;
}

export interface Phase3Data {
    productTypes: string[];
    specialties?: string[];
    monthlyCapacity: number;
    currentOccupancy?: number;
    onboardingComplete?: boolean;
}

interface CompanyWithProfile {
    id: string;
    supplierProfile: SupplierProfile | null;
}

// Mock state
let mockProfile: SupplierProfile = {
    id: 'profile-001',
    companyId: 'company-supplier-001',
    onboardingPhase: 2,
    onboardingComplete: false,
    businessQualification: {
        interesse: 'Alta capacidade produtiva',
        faturamentoDesejado: 50000,
        maturidadeGestao: 'Intermediária',
        qtdColaboradores: 15,
        tempoMercado: '5-10 anos'
    }
};

export const onboardingService = {
    async getProfile(): Promise<SupplierProfile | null> {
        if (MOCK_MODE) {
            await simulateDelay(300);
            return mockProfile;
        }
        const response = await api.get<CompanyWithProfile>('/suppliers/profile');
        return response.data.supplierProfile;
    },

    async updatePhase2(data: Phase2Data): Promise<SupplierProfile> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            mockProfile = {
                ...mockProfile,
                businessQualification: { ...mockProfile.businessQualification, ...data },
                onboardingPhase: 2
            };
            return mockProfile;
        }
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/phase2', data);
        return response.data;
    },

    async updatePhase3(data: Phase3Data): Promise<SupplierProfile> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            mockProfile = {
                ...mockProfile,
                ...data,
                onboardingPhase: 3
            };
            return mockProfile;
        }
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/phase3', data);
        return response.data;
    },

    async completeOnboarding(): Promise<SupplierProfile> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            mockProfile = {
                ...mockProfile,
                onboardingComplete: true
            };
            return mockProfile;
        }
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/complete');
        return response.data;
    },
};
