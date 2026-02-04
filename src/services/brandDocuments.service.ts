import api from './api';
import { MOCK_MODE } from './mockMode';

export type BrandDocumentType =
  | 'CODE_OF_CONDUCT'
  | 'TERMS_OF_SERVICE'
  | 'PRIVACY_POLICY'
  | 'OTHER';

export type BrandDocumentStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface BrandDocument {
  id: string;
  brandId: string;
  type: BrandDocumentType;
  status: BrandDocumentStatus;
  title: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  version: string;
  versionNumber: number;
  isRequired: boolean;
  requiresReacceptance: boolean;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  brand?: {
    id: string;
    tradeName?: string;
    legalName: string;
  };
  uploadedBy?: {
    id: string;
    name: string;
  };
  versions?: BrandDocumentVersion[];
  _count?: {
    acceptances: number;
  };
}

export interface BrandDocumentVersion {
  id: string;
  documentId: string;
  version: string;
  versionNumber: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
  notes?: string;
}

export interface BrandDocumentAcceptance {
  id: string;
  documentId: string;
  relationshipId: string;
  acceptedAt: string;
  acceptedVersion: string;
  acceptedVersionNumber: number;
  acceptedById: string;
  acceptedByName: string;
  acceptedByRole?: string;
  clientIp: string;
  userAgent?: string;
  checkboxConfirmed: boolean;
}

export interface DocumentWithAcceptance extends BrandDocument {
  isAccepted: boolean;
  acceptance: BrandDocumentAcceptance | null;
  relationshipId: string;
}

export interface AcceptanceReport {
  document: BrandDocument;
  totalSuppliers: number;
  acceptedCount: number;
  pendingCount: number;
  acceptances: {
    id: string;
    acceptedAt: string;
    acceptedVersion: string;
    acceptedByName: string;
    acceptedByRole?: string;
    supplier: {
      id: string;
      name: string;
    };
  }[];
  pendingSuppliers: {
    id: string;
    name: string;
    relationshipId: string;
  }[];
}

export interface BrandDocumentFilters {
  type?: BrandDocumentType;
  status?: BrandDocumentStatus;
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

export interface UploadDocumentData {
  type: BrandDocumentType;
  title: string;
  description?: string;
  isRequired?: boolean;
  requiresReacceptance?: boolean;
}

export interface UpdateDocumentData {
  title?: string;
  description?: string;
  isRequired?: boolean;
  requiresReacceptance?: boolean;
  versionNotes?: string;
}

export interface AcceptDocumentData {
  documentId: string;
  relationshipId: string;
  checkboxConfirmed: boolean;
  acceptedByName: string;
  acceptedByRole?: string;
}

export interface SendRemindersResponse {
  remindersSent: number;
  suppliers: {
    id: string;
    name: string;
  }[];
}

// Mock data for development
const mockDocuments: BrandDocument[] = [
  {
    id: 'doc-1',
    brandId: 'brand-1',
    type: 'CODE_OF_CONDUCT',
    status: 'ACTIVE',
    title: 'Código de Conduta do Fornecedor 2024',
    description: 'Este documento estabelece os padrões de conduta esperados de todos os nossos parceiros de produção.',
    fileName: 'codigo_conduta_2024.pdf',
    fileUrl: '/uploads/brand-documents/codigo_conduta_2024.pdf',
    fileSize: 2048576,
    mimeType: 'application/pdf',
    version: '1.0',
    versionNumber: 1,
    isRequired: true,
    requiresReacceptance: true,
    uploadedById: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    uploadedBy: {
      id: 'user-1',
      name: 'João Silva',
    },
    _count: {
      acceptances: 5,
    },
  },
];

export const brandDocumentsService = {
  /**
   * Upload a new brand document
   */
  async uploadDocument(file: File, data: UploadDocumentData): Promise<BrandDocument> {
    if (MOCK_MODE) {
      const newDoc: BrandDocument = {
        id: `doc-${Date.now()}`,
        brandId: 'mock-brand-id',
        type: data.type,
        status: 'ACTIVE',
        title: data.title,
        description: data.description,
        fileName: file.name,
        fileUrl: `/uploads/brand-documents/${file.name}`,
        fileSize: file.size,
        mimeType: file.type,
        version: '1.0',
        versionNumber: 1,
        isRequired: data.isRequired ?? false,
        requiresReacceptance: data.requiresReacceptance ?? true,
        uploadedById: 'mock-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uploadedBy: {
          id: 'mock-user-id',
          name: 'Usuário Mock',
        },
        _count: {
          acceptances: 0,
        },
      };
      mockDocuments.push(newDoc);
      return newDoc;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', data.type);
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.isRequired !== undefined) formData.append('isRequired', String(data.isRequired));
    if (data.requiresReacceptance !== undefined) formData.append('requiresReacceptance', String(data.requiresReacceptance));

    const response = await api.post<BrandDocument>('/brand-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Update a document (optionally with new file)
   */
  async updateDocument(id: string, file?: File, data?: UpdateDocumentData): Promise<BrandDocument> {
    if (MOCK_MODE) {
      const doc = mockDocuments.find(d => d.id === id);
      if (!doc) throw new Error('Document not found');

      if (data?.title) doc.title = data.title;
      if (data?.description) doc.description = data.description;
      if (data?.isRequired !== undefined) doc.isRequired = data.isRequired;
      if (data?.requiresReacceptance !== undefined) doc.requiresReacceptance = data.requiresReacceptance;
      doc.versionNumber += 1;
      doc.version = `${doc.versionNumber}.0`;
      doc.updatedAt = new Date().toISOString();

      return doc;
    }

    const formData = new FormData();
    if (file) formData.append('file', file);
    if (data?.title) formData.append('title', data.title);
    if (data?.description) formData.append('description', data.description);
    if (data?.isRequired !== undefined) formData.append('isRequired', String(data.isRequired));
    if (data?.requiresReacceptance !== undefined) formData.append('requiresReacceptance', String(data.requiresReacceptance));
    if (data?.versionNotes) formData.append('versionNotes', data.versionNotes);

    const response = await api.patch<BrandDocument>(`/brand-documents/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Archive a document
   */
  async archiveDocument(id: string): Promise<void> {
    if (MOCK_MODE) {
      const doc = mockDocuments.find(d => d.id === id);
      if (doc) {
        doc.status = 'ARCHIVED';
        doc.archivedAt = new Date().toISOString();
      }
      return;
    }

    await api.delete(`/brand-documents/${id}`);
  },

  /**
   * Get documents for brand
   */
  async getDocuments(filters?: BrandDocumentFilters): Promise<PaginatedResponse<BrandDocument>> {
    if (MOCK_MODE) {
      let filtered = mockDocuments.filter(d => {
        if (filters?.type && d.type !== filters.type) return false;
        if (filters?.status && d.status !== filters.status) return false;
        return true;
      });

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

    const response = await api.get<PaginatedResponse<BrandDocument>>('/brand-documents', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<BrandDocument> {
    if (MOCK_MODE) {
      const doc = mockDocuments.find(d => d.id === id);
      if (!doc) throw new Error('Document not found');
      return doc;
    }

    const response = await api.get<BrandDocument>(`/brand-documents/${id}`);
    return response.data;
  },

  /**
   * Get acceptance report for a document
   */
  async getAcceptanceReport(id: string): Promise<AcceptanceReport> {
    if (MOCK_MODE) {
      const doc = mockDocuments.find(d => d.id === id);
      if (!doc) throw new Error('Document not found');

      return {
        document: doc,
        totalSuppliers: 10,
        acceptedCount: 5,
        pendingCount: 5,
        acceptances: [
          {
            id: 'acc-1',
            acceptedAt: new Date().toISOString(),
            acceptedVersion: '1.0',
            acceptedByName: 'Maria Facção',
            acceptedByRole: 'Proprietária',
            supplier: { id: 'supplier-1', name: 'Confecção ABC' },
          },
          {
            id: 'acc-2',
            acceptedAt: new Date(Date.now() - 86400000).toISOString(),
            acceptedVersion: '1.0',
            acceptedByName: 'José Costura',
            supplier: { id: 'supplier-2', name: 'Facção XYZ' },
          },
        ],
        pendingSuppliers: [
          { id: 'supplier-3', name: 'Costura 123', relationshipId: 'rel-3' },
          { id: 'supplier-4', name: 'Facção Beta', relationshipId: 'rel-4' },
        ],
      };
    }

    const response = await api.get<AcceptanceReport>(`/brand-documents/${id}/acceptances`);
    return response.data;
  },

  // ========== Supplier Methods ==========

  /**
   * Get documents for a brand (supplier perspective)
   */
  async getDocumentsForBrand(brandId: string): Promise<DocumentWithAcceptance[]> {
    if (MOCK_MODE) {
      return mockDocuments
        .filter(d => d.status === 'ACTIVE')
        .map(d => ({
          ...d,
          isAccepted: Math.random() > 0.5,
          acceptance: null,
          relationshipId: 'mock-rel-id',
        }));
    }

    const response = await api.get<DocumentWithAcceptance[]>(`/brand-documents/by-brand/${brandId}`);
    return response.data;
  },

  /**
   * Get pending documents for a relationship
   */
  async getPendingDocuments(relationshipId: string): Promise<BrandDocument[]> {
    if (MOCK_MODE) {
      return mockDocuments.filter(d => d.status === 'ACTIVE' && d.isRequired);
    }

    const response = await api.get<BrandDocument[]>(`/brand-documents/pending/${relationshipId}`);
    return response.data;
  },

  /**
   * Get pending documents count for supplier (for badge)
   */
  async getPendingCount(): Promise<number> {
    if (MOCK_MODE) {
      return 2;
    }

    const response = await api.get<number>('/brand-documents/pending-count');
    return response.data;
  },

  /**
   * Accept a document
   */
  async acceptDocument(data: AcceptDocumentData): Promise<BrandDocumentAcceptance> {
    if (MOCK_MODE) {
      return {
        id: `acc-${Date.now()}`,
        documentId: data.documentId,
        relationshipId: data.relationshipId,
        acceptedAt: new Date().toISOString(),
        acceptedVersion: '1.0',
        acceptedVersionNumber: 1,
        acceptedById: 'mock-user-id',
        acceptedByName: data.acceptedByName,
        acceptedByRole: data.acceptedByRole,
        clientIp: '127.0.0.1',
        checkboxConfirmed: true,
      };
    }

    const response = await api.post<BrandDocumentAcceptance>('/brand-documents/accept', data);
    return response.data;
  },

  /**
   * Download document (returns blob)
   */
  async downloadDocument(documentId: string): Promise<Blob> {
    if (MOCK_MODE) {
      // Return a mock PDF blob
      return new Blob(['Mock PDF content'], { type: 'application/pdf' });
    }

    const doc = await this.getDocument(documentId);
    const response = await api.get(doc.fileUrl, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Send reminders to pending suppliers
   */
  async sendReminders(documentId: string): Promise<SendRemindersResponse> {
    if (MOCK_MODE) {
      return {
        remindersSent: 3,
        suppliers: [
          { id: 'supplier-3', name: 'Costura 123' },
          { id: 'supplier-4', name: 'Facção Beta' },
          { id: 'supplier-5', name: 'Confecções Delta' },
        ],
      };
    }

    const response = await api.post<SendRemindersResponse>(`/brand-documents/${documentId}/send-reminders`);
    return response.data;
  },

  // ========== Utility Methods ==========

  /**
   * Get document type label
   */
  getTypeLabel(type: BrandDocumentType): string {
    const labels: Record<BrandDocumentType, string> = {
      CODE_OF_CONDUCT: 'Código de Conduta',
      TERMS_OF_SERVICE: 'Termos de Serviço',
      PRIVACY_POLICY: 'Política de Privacidade',
      OTHER: 'Outro',
    };
    return labels[type] || type;
  },

  /**
   * Get status label
   */
  getStatusLabel(status: BrandDocumentStatus): string {
    const labels: Record<BrandDocumentStatus, string> = {
      DRAFT: 'Rascunho',
      ACTIVE: 'Ativo',
      ARCHIVED: 'Arquivado',
    };
    return labels[status] || status;
  },

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};

export default brandDocumentsService;
