import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import type {
    SupplierBrandRelationship,
    CreateRelationshipDto,
    UpdateRelationshipDto,
    RelationshipActionDto,
    RelationshipStats,
    SupplierCompany,
} from '../types/relationships';

/**
 * Service for managing N:M supplier-brand relationships (V3 Architecture)
 */

class RelationshipsService {
    /**
     * Create a new relationship (brand credentials a supplier from the pool)
     */
    async create(dto: CreateRelationshipDto): Promise<SupplierBrandRelationship> {
        if (MOCK_MODE) {
            await simulateDelay();
            return {
                id: 'rel-' + Date.now(),
                supplierId: dto.supplierId,
                brandId: dto.brandId,
                status: 'CONTRACT_PENDING',
                initiatedBy: 'current-user',
                initiatedByRole: 'BRAND',
                internalCode: dto.internalCode,
                notes: dto.notes,
                priority: dto.priority || 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        }

        const response = await api.post('/relationships', dto);
        return response.data;
    }

    /**
     * Get relationships for a brand (brand's credentialed suppliers)
     */
    async getByBrand(brandId: string): Promise<SupplierBrandRelationship[]> {
        if (MOCK_MODE) {
            await simulateDelay();
            return [];
        }

        const response = await api.get(`/relationships/brand/${brandId}`);
        return response.data;
    }

    /**
     * Get relationships for a supplier (supplier's brands)
     */
    async getBySupplier(supplierId: string): Promise<SupplierBrandRelationship[]> {
        if (MOCK_MODE) {
            await simulateDelay();
            return [];
        }

        const response = await api.get(`/relationships/supplier/${supplierId}`);
        return response.data;
    }

    /**
     * Get suppliers available for brand to credential (pool)
     */
    async getAvailableForBrand(brandId: string): Promise<SupplierCompany[]> {
        if (MOCK_MODE) {
            await simulateDelay();
            return [];
        }

        const response = await api.get(`/relationships/available/${brandId}`);
        return response.data;
    }

    /**
     * Get a specific relationship
     */
    async getOne(relationshipId: string): Promise<SupplierBrandRelationship> {
        if (MOCK_MODE) {
            await simulateDelay();
            throw new Error('Relationship not found');
        }

        const response = await api.get(`/relationships/${relationshipId}`);
        return response.data;
    }

    /**
     * Update a relationship
     */
    async update(
        relationshipId: string,
        dto: UpdateRelationshipDto
    ): Promise<SupplierBrandRelationship> {
        if (MOCK_MODE) {
            await simulateDelay();
            return {} as SupplierBrandRelationship;
        }

        const response = await api.patch(`/relationships/${relationshipId}`, dto);
        return response.data;
    }

    /**
     * Activate a relationship (after contract signed)
     */
    async activate(relationshipId: string): Promise<SupplierBrandRelationship> {
        if (MOCK_MODE) {
            await simulateDelay();
            return {} as SupplierBrandRelationship;
        }

        const response = await api.post(`/relationships/${relationshipId}/activate`);
        return response.data;
    }

    /**
     * Suspend a relationship
     */
    async suspend(
        relationshipId: string,
        dto: RelationshipActionDto
    ): Promise<SupplierBrandRelationship> {
        if (MOCK_MODE) {
            await simulateDelay();
            return {} as SupplierBrandRelationship;
        }

        const response = await api.post(`/relationships/${relationshipId}/suspend`, dto);
        return response.data;
    }

    /**
     * Reactivate a suspended relationship
     */
    async reactivate(relationshipId: string): Promise<SupplierBrandRelationship> {
        if (MOCK_MODE) {
            await simulateDelay();
            return {} as SupplierBrandRelationship;
        }

        const response = await api.post(`/relationships/${relationshipId}/reactivate`);
        return response.data;
    }

    /**
     * Terminate a relationship (permanent)
     */
    async terminate(
        relationshipId: string,
        dto: RelationshipActionDto
    ): Promise<SupplierBrandRelationship> {
        if (MOCK_MODE) {
            await simulateDelay();
            return {} as SupplierBrandRelationship;
        }

        const response = await api.post(`/relationships/${relationshipId}/terminate`, dto);
        return response.data;
    }

    // ==================== CONTRACT METHODS ====================

    /**
     * Generate contract for a relationship
     */
    async generateContract(
        relationshipId: string,
        terms?: Record<string, any>
    ): Promise<any> {
        if (MOCK_MODE) {
            await simulateDelay();
            return { id: 'contract-' + Date.now(), documentUrl: '/mock-contract.pdf' };
        }

        const response = await api.post(
            `/relationships/${relationshipId}/contract/generate`,
            terms || {}
        );
        return response.data;
    }

    /**
     * Get contract for a relationship
     */
    async getContract(relationshipId: string): Promise<any> {
        if (MOCK_MODE) {
            await simulateDelay();
            return null;
        }

        const response = await api.get(`/relationships/${relationshipId}/contract`);
        return response.data;
    }

    /**
     * Sign contract (supplier only)
     */
    async signContract(relationshipId: string): Promise<any> {
        if (MOCK_MODE) {
            await simulateDelay();
            return { success: true };
        }

        const response = await api.post(`/relationships/${relationshipId}/contract/sign`);
        return response.data;
    }

    /**
     * Get statistics for brand's relationships
     */
    async getStats(brandId: string): Promise<RelationshipStats> {
        if (MOCK_MODE) {
            await simulateDelay();
            return {
                total: 0,
                active: 0,
                suspended: 0,
                pending: 0,
                contractPending: 0,
                terminated: 0,
            };
        }

        const relationships = await this.getByBrand(brandId);

        return {
            total: relationships.length,
            active: relationships.filter((r) => r.status === 'ACTIVE').length,
            suspended: relationships.filter((r) => r.status === 'SUSPENDED').length,
            pending: relationships.filter((r) => r.status === 'PENDING').length,
            contractPending: relationships.filter((r) => r.status === 'CONTRACT_PENDING')
                .length,
            terminated: relationships.filter((r) => r.status === 'TERMINATED').length,
        };
    }

    // ==================== LGPD CONSENT METHODS ====================

    /**
     * Get consent status for a relationship
     */
    async getConsentStatus(relationshipId: string): Promise<ConsentStatus> {
        if (MOCK_MODE) {
            await simulateDelay();
            return {
                relationshipId,
                documentSharingConsent: true,
                documentSharingConsentAt: new Date().toISOString(),
                documentSharingRevokedAt: null,
                documentSharingRevokedReason: null,
                status: 'ACTIVE',
            };
        }

        const response = await api.get(`/suppliers/relationships/${relationshipId}/consent`);
        return response.data;
    }

    /**
     * Update consent (grant or remove without terminating relationship)
     */
    async updateConsent(relationshipId: string, consent: boolean): Promise<ConsentUpdateResponse> {
        if (MOCK_MODE) {
            await simulateDelay();
            return {
                success: true,
                message: consent ? 'Consentimento concedido' : 'Consentimento removido',
                documentSharingConsent: consent,
                documentSharingConsentAt: consent ? new Date().toISOString() : null,
            };
        }

        const response = await api.patch(`/suppliers/relationships/${relationshipId}/consent`, {
            consent,
        });
        return response.data;
    }

    /**
     * Revoke consent and terminate relationship (LGPD right)
     */
    async revokeConsent(relationshipId: string, reason: string): Promise<RevokeConsentResponse> {
        if (MOCK_MODE) {
            await simulateDelay();
            return {
                success: true,
                message: 'Consentimento revogado e relacionamento encerrado',
                relationship: {
                    id: relationshipId,
                    status: 'TERMINATED',
                    documentSharingConsent: false,
                    documentSharingRevokedAt: new Date().toISOString(),
                },
            };
        }

        const response = await api.post(`/suppliers/relationships/${relationshipId}/revoke-consent`, {
            reason,
        });
        return response.data;
    }
}

// Types for consent management
export interface ConsentStatus {
    relationshipId: string;
    documentSharingConsent: boolean;
    documentSharingConsentAt: string | null;
    documentSharingRevokedAt: string | null;
    documentSharingRevokedReason: string | null;
    status: string;
}

export interface ConsentUpdateResponse {
    success: boolean;
    message: string;
    documentSharingConsent: boolean;
    documentSharingConsentAt: string | null;
}

export interface RevokeConsentResponse {
    success: boolean;
    message: string;
    relationship: {
        id: string;
        status: string;
        documentSharingConsent: boolean;
        documentSharingRevokedAt: string;
    };
}

export const relationshipsService = new RelationshipsService();
export default relationshipsService;
