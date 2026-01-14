import api from './api';

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

export const onboardingService = {
    async getProfile(): Promise<SupplierProfile | null> {
        const response = await api.get<CompanyWithProfile>('/suppliers/profile');
        return response.data.supplierProfile;
    },

    async updatePhase2(data: Phase2Data): Promise<SupplierProfile> {
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/phase2', data);
        return response.data;
    },

    async updatePhase3(data: Phase3Data): Promise<SupplierProfile> {
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/phase3', data);
        return response.data;
    },

    async completeOnboarding(): Promise<SupplierProfile> {
        const response = await api.patch<SupplierProfile>('/suppliers/onboarding/complete');
        return response.data;
    },
};
