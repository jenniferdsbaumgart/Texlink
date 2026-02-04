import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_SUPPLIERS, MOCK_SUPPLIER_DASHBOARD, MOCK_OPPORTUNITIES } from './mockData';
import type { SupplierDocument } from '../types';

export interface SupplierDashboard {
    company: {
        id: string;
        tradeName: string;
        avgRating: number;
        status: string;
    };
    profile: {
        onboardingPhase: number;
        onboardingComplete: boolean;
        monthlyCapacity: number;
        currentOccupancy: number;
    };
    stats: {
        pendingOrders: number;
        activeOrders: number;
        completedOrdersThisMonth: number;
        totalRevenue: number;
        capacityUsage: number;
    };
}

export interface OnboardingPhase2 {
    interesse?: string;
    faturamentoDesejado?: number;
    maturidadeGestao?: string;
    qtdColaboradores?: number;
    tempoMercado?: string;
}

export interface OnboardingPhase3 {
    productTypes: string[];
    specialties?: string[];
    monthlyCapacity: number;
    currentOccupancy?: number;
    onboardingComplete?: boolean;
}

export interface SupplierSearchFilters {
    city?: string;
    state?: string;
    productTypes?: string[];
    specialties?: string[];
    minCapacity?: number;
    maxCapacity?: number;
    minRating?: number;
}

export interface Supplier {
    id: string;
    tradeName: string;
    legalName?: string;
    cnpj?: string;
    city: string;
    state: string;
    email?: string;
    phone?: string;
    avgRating: number;
    completedOrders: number;
    onTimeDeliveryRate: number;
    productTypes: string[];
    specialties: string[];
    monthlyCapacity: number;
    currentOccupancy: number;
    status: string;
    minOrderQuantity?: number;
    avgLeadTime?: number;
    profile?: {
        description?: string;
        equipment?: string[];
        certifications?: string[];
        photos?: string[];
    };
}

// ==================== INVITATION TYPES ====================

export interface CNPJValidationResult {
    isValid: boolean;
    data?: {
        cnpj: string;
        razaoSocial: string;
        nomeFantasia?: string;
        situacao: string;
        dataSituacao?: string;
        dataAbertura?: string;
        naturezaJuridica?: string;
        capitalSocial?: number;
        porte?: string;
        endereco: {
            logradouro: string;
            numero: string;
            complemento?: string;
            bairro: string;
            municipio: string;
            uf: string;
            cep: string;
        };
        atividadePrincipal?: {
            codigo: string;
            descricao: string;
        };
        telefone?: string;
        email?: string;
    };
    error?: string;
    source: string;
    timestamp: Date;
}

export type InvitationChannel = 'EMAIL' | 'WHATSAPP' | 'BOTH';

export interface InviteSupplierDto {
    cnpj: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp?: string;
    customMessage?: string;
    sendVia: InvitationChannel;
    internalCode?: string;
    notes?: string;
}

export interface InviteSupplierResponse {
    id: string;
    cnpj: string;
    legalName?: string;
    status: string;
    message: string;
    expiresAt: Date;
}

export interface SupplierInvitation {
    id: string;
    cnpj: string;
    legalName?: string;
    tradeName?: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp?: string;
    status: string;
    internalCode?: string;
    createdAt: Date;
    expiresAt?: Date;
    lastInvitationSentAt?: Date;
    canResend: boolean;
}

export interface ResendInvitationDto {
    sendVia?: InvitationChannel;
    customMessage?: string;
}

// ==================== SERVICE ====================

export const suppliersService = {
    async getMyProfile() {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return MOCK_SUPPLIERS[0]; // Return first supplier as "my profile"
        }

        const response = await api.get('/suppliers/profile');
        return response.data;
    },

    async updatePhase2(data: OnboardingPhase2) {
        if (MOCK_MODE) {
            await simulateDelay(600);
            console.log('[MOCK] Onboarding Phase 2 updated:', data);
            return { success: true, message: 'Dados salvos (modo demo)' };
        }

        const response = await api.patch('/suppliers/onboarding/phase2', data);
        return response.data;
    },

    async updatePhase3(data: OnboardingPhase3) {
        if (MOCK_MODE) {
            await simulateDelay(600);
            console.log('[MOCK] Onboarding Phase 3 updated:', data);
            return { success: true, message: 'Dados salvos (modo demo)' };
        }

        const response = await api.patch('/suppliers/onboarding/phase3', data);
        return response.data;
    },

    async getDashboard(): Promise<SupplierDashboard> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return MOCK_SUPPLIER_DASHBOARD;
        }

        const response = await api.get<SupplierDashboard>('/suppliers/dashboard');
        return response.data;
    },

    async getOpportunities() {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return MOCK_OPPORTUNITIES;
        }

        const response = await api.get('/suppliers/opportunities');
        return response.data;
    },

    async search(filters: SupplierSearchFilters): Promise<Supplier[]> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            let results = [...MOCK_SUPPLIERS];

            if (filters.city) {
                results = results.filter(s => s.city.toLowerCase().includes(filters.city!.toLowerCase()));
            }
            if (filters.state) {
                results = results.filter(s => s.state === filters.state);
            }
            if (filters.productTypes?.length) {
                results = results.filter(s =>
                    s.productTypes.some(pt => filters.productTypes!.includes(pt))
                );
            }
            if (filters.minRating) {
                results = results.filter(s => s.avgRating >= filters.minRating!);
            }
            if (filters.minCapacity) {
                results = results.filter(s => s.monthlyCapacity >= filters.minCapacity!);
            }

            return results as Supplier[];
        }

        const response = await api.get('/suppliers', { params: filters });
        return response.data;
    },

    async getById(id: string): Promise<Supplier> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            const supplier = MOCK_SUPPLIERS.find(s => s.id === id);
            if (!supplier) {
                throw new Error('Fornecedor não encontrado');
            }
            return supplier as Supplier;
        }

        const response = await api.get(`/suppliers/${id}`);
        return response.data;
    },

    // Get supplier documents for a brand (requires active relationship)
    async getSupplierDocuments(supplierId: string): Promise<SupplierDocument[]> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return []; // No mock data for documents
        }

        const response = await api.get<SupplierDocument[]>(
            `/supplier-documents/brand/suppliers/${supplierId}`
        );
        return response.data;
    },

    // ==================== INVITATION METHODS ====================

    /**
     * Validate CNPJ via Brasil API
     */
    async validateCnpj(cnpj: string): Promise<CNPJValidationResult> {
        if (MOCK_MODE) {
            await simulateDelay(800);
            const cleaned = cnpj.replace(/\D/g, '');
            if (cleaned.length !== 14) {
                return {
                    isValid: false,
                    error: 'CNPJ deve conter 14 dígitos',
                    source: 'MOCK',
                    timestamp: new Date(),
                };
            }
            // Return mock valid data
            return {
                isValid: true,
                data: {
                    cnpj: cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
                    razaoSocial: 'Empresa Exemplo LTDA',
                    nomeFantasia: 'Exemplo Confecções',
                    situacao: 'ATIVA',
                    endereco: {
                        logradouro: 'Rua das Flores',
                        numero: '123',
                        bairro: 'Centro',
                        municipio: 'São Paulo',
                        uf: 'SP',
                        cep: '01234-567',
                    },
                    atividadePrincipal: {
                        codigo: '14.12-6-01',
                        descricao: 'Confecção de peças do vestuário, exceto roupas íntimas e as confeccionadas sob medida',
                    },
                },
                source: 'MOCK',
                timestamp: new Date(),
            };
        }

        const response = await api.get<CNPJValidationResult>(`/suppliers/validate-cnpj/${cnpj}`);
        return response.data;
    },

    /**
     * Invite a new supplier
     */
    async inviteSupplier(data: InviteSupplierDto): Promise<InviteSupplierResponse> {
        if (MOCK_MODE) {
            await simulateDelay(1000);
            console.log('[MOCK] Supplier invited:', data);
            return {
                id: crypto.randomUUID(),
                cnpj: data.cnpj,
                legalName: 'Empresa Exemplo LTDA',
                status: 'INVITATION_SENT',
                message: `Convite enviado para ${data.contactEmail}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            };
        }

        const response = await api.post<InviteSupplierResponse>('/suppliers/invite', data);
        return response.data;
    },

    /**
     * Get all invitations for current brand
     */
    async getInvitations(): Promise<SupplierInvitation[]> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            return [
                {
                    id: '1',
                    cnpj: '12.345.678/0001-90',
                    legalName: 'Confecções Silva LTDA',
                    tradeName: 'Silva Moda',
                    contactName: 'Maria Silva',
                    contactEmail: 'maria@silva.com',
                    contactPhone: '11999998888',
                    status: 'INVITATION_SENT',
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    canResend: true,
                },
                {
                    id: '2',
                    cnpj: '98.765.432/0001-10',
                    legalName: 'Facção Santos ME',
                    contactName: 'João Santos',
                    contactEmail: 'joao@santos.com',
                    contactPhone: '11988887777',
                    status: 'ONBOARDING_STARTED',
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                    canResend: false,
                },
            ];
        }

        const response = await api.get<SupplierInvitation[]>('/suppliers/invitations');
        return response.data;
    },

    /**
     * Resend an invitation
     */
    async resendInvitation(invitationId: string, options?: ResendInvitationDto): Promise<{ success: boolean; message: string }> {
        if (MOCK_MODE) {
            await simulateDelay(800);
            console.log('[MOCK] Invitation resent:', invitationId, options);
            return { success: true, message: 'Convite reenviado com sucesso' };
        }

        const response = await api.post(`/suppliers/invitations/${invitationId}/resend`, options || {});
        return response.data;
    },
};

