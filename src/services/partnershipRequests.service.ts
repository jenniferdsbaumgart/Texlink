import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';

export type PartnershipRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface PartnershipRequest {
  id: string;
  brandId: string;
  supplierId: string;
  requestedById: string;
  status: PartnershipRequestStatus;
  message?: string;
  respondedById?: string;
  respondedAt?: string;
  rejectionReason?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  relationshipId?: string;
  brand?: {
    id: string;
    tradeName?: string;
    legalName: string;
    city: string;
    state: string;
    logoUrl?: string;
  };
  supplier?: {
    id: string;
    tradeName?: string;
    legalName: string;
    city: string;
    state: string;
    avgRating?: number;
    logoUrl?: string;
  };
  requestedBy?: {
    id: string;
    name: string;
    email?: string;
  };
  respondedBy?: {
    id: string;
    name: string;
  };
}

export interface PartnershipRequestFilters {
  status?: PartnershipRequestStatus;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CheckExistingResponse {
  hasActiveRelationship: boolean;
  hasPendingRequest: boolean;
  pendingRequestId: string | null;
  relationshipStatus: string | null;
}

// Mock data for development
const mockRequests: PartnershipRequest[] = [
  {
    id: '1',
    brandId: 'brand-1',
    supplierId: 'supplier-1',
    requestedById: 'user-1',
    status: 'PENDING',
    message: 'Gostaríamos de estabelecer uma parceria com vocês para produção de camisetas infantis.',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    brand: {
      id: 'brand-1',
      tradeName: 'Marca Fashion',
      legalName: 'Fashion Ltda',
      city: 'São Paulo',
      state: 'SP',
      logoUrl: undefined,
    },
    supplier: {
      id: 'supplier-1',
      tradeName: 'Confecção ABC',
      legalName: 'ABC Confecções Ltda',
      city: 'Blumenau',
      state: 'SC',
      avgRating: 4.5,
    },
    requestedBy: {
      id: 'user-1',
      name: 'João Silva',
      email: 'joao@marcafashion.com',
    },
  },
];

export const partnershipRequestsService = {
  /**
   * Create a new partnership request (Brand)
   */
  async create(data: { supplierId: string; message?: string }): Promise<PartnershipRequest> {
    if (MOCK_MODE) {
      const newRequest: PartnershipRequest = {
        id: `req-${Date.now()}`,
        brandId: 'mock-brand-id',
        supplierId: data.supplierId,
        requestedById: 'mock-user-id',
        status: 'PENDING',
        message: data.message,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockRequests.push(newRequest);
      return newRequest;
    }

    const response = await api.post<PartnershipRequest>('/partnership-requests', data);
    return response.data;
  },

  /**
   * Get requests sent by brand
   */
  async getSent(filters?: PartnershipRequestFilters): Promise<PaginatedResponse<PartnershipRequest>> {
    if (MOCK_MODE) {
      const filtered = mockRequests.filter(r =>
        !filters?.status || r.status === filters.status
      );
      return {
        data: filtered,
        meta: {
          total: filtered.length,
          page: filters?.page || 1,
          limit: filters?.limit || 10,
          totalPages: Math.ceil(filtered.length / (filters?.limit || 10)),
        },
      };
    }

    const response = await api.get<PaginatedResponse<PartnershipRequest>>('/partnership-requests/sent', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get requests received by supplier
   */
  async getReceived(filters?: PartnershipRequestFilters): Promise<PaginatedResponse<PartnershipRequest>> {
    if (MOCK_MODE) {
      const filtered = mockRequests.filter(r =>
        !filters?.status || r.status === filters.status
      );
      return {
        data: filtered,
        meta: {
          total: filtered.length,
          page: filters?.page || 1,
          limit: filters?.limit || 10,
          totalPages: Math.ceil(filtered.length / (filters?.limit || 10)),
        },
      };
    }

    const response = await api.get<PaginatedResponse<PartnershipRequest>>('/partnership-requests/received', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get pending count for supplier (for badge)
   */
  async getPendingCount(): Promise<number> {
    if (MOCK_MODE) {
      return mockRequests.filter(r => r.status === 'PENDING').length;
    }

    const response = await api.get<number>('/partnership-requests/pending-count');
    return response.data;
  },

  /**
   * Check existing request/relationship with supplier
   */
  async checkExisting(supplierId: string): Promise<CheckExistingResponse> {
    if (MOCK_MODE) {
      const pending = mockRequests.find(
        r => r.supplierId === supplierId && r.status === 'PENDING'
      );
      return {
        hasActiveRelationship: false,
        hasPendingRequest: !!pending,
        pendingRequestId: pending?.id || null,
        relationshipStatus: null,
      };
    }

    const response = await api.get<CheckExistingResponse>(`/partnership-requests/check/${supplierId}`);
    return response.data;
  },

  /**
   * Get request by ID
   */
  async getById(id: string): Promise<PartnershipRequest> {
    if (MOCK_MODE) {
      const request = mockRequests.find(r => r.id === id);
      if (!request) throw new Error('Request not found');
      return request;
    }

    const response = await api.get<PartnershipRequest>(`/partnership-requests/${id}`);
    return response.data;
  },

  /**
   * Respond to a request (Supplier)
   * @param id - Request ID
   * @param data - Response data including consent for document sharing
   */
  async respond(
    id: string,
    data: { accepted: boolean; rejectionReason?: string; documentSharingConsent?: boolean }
  ): Promise<PartnershipRequest> {
    if (MOCK_MODE) {
      const request = mockRequests.find(r => r.id === id);
      if (!request) throw new Error('Request not found');

      request.status = data.accepted ? 'ACCEPTED' : 'REJECTED';
      request.respondedAt = new Date().toISOString();
      request.rejectionReason = data.rejectionReason;
      request.updatedAt = new Date().toISOString();

      return request;
    }

    const response = await api.post<PartnershipRequest>(`/partnership-requests/${id}/respond`, data);
    return response.data;
  },

  /**
   * Cancel a pending request (Brand)
   */
  async cancel(id: string): Promise<PartnershipRequest> {
    if (MOCK_MODE) {
      const request = mockRequests.find(r => r.id === id);
      if (!request) throw new Error('Request not found');

      request.status = 'CANCELLED';
      request.updatedAt = new Date().toISOString();

      return request;
    }

    const response = await api.post<PartnershipRequest>(`/partnership-requests/${id}/cancel`);
    return response.data;
  },
};

export default partnershipRequestsService;
