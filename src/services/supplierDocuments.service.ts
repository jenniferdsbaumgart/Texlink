import api from './api';
import type {
    SupplierDocument,
    SupplierDocumentSummary,
    SupplierDocumentChecklistItem,
    SupplierDocumentType,
    SupplierDocumentStatus,
} from '../types';

export interface CreateSupplierDocumentDto {
    type: SupplierDocumentType;
    competenceMonth?: number;
    competenceYear?: number;
    expiresAt?: string;
    notes?: string;
}

export interface UpdateSupplierDocumentDto {
    competenceMonth?: number;
    competenceYear?: number;
    expiresAt?: string;
    notes?: string;
}

class SupplierDocumentsService {
    private readonly basePath = '/supplier-documents';

    // Get all documents (with optional filters)
    async getAll(
        type?: SupplierDocumentType,
        status?: SupplierDocumentStatus
    ): Promise<SupplierDocument[]> {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (status) params.append('status', status);

        const response = await api.get<SupplierDocument[]>(
            `${this.basePath}?${params.toString()}`
        );
        return response.data;
    }

    // Get document summary (counts by status)
    async getSummary(): Promise<SupplierDocumentSummary> {
        const response = await api.get<SupplierDocumentSummary>(
            `${this.basePath}/summary`
        );
        return response.data;
    }

    // Get document checklist (all types with status)
    async getChecklist(): Promise<SupplierDocumentChecklistItem[]> {
        const response = await api.get<SupplierDocumentChecklistItem[]>(
            `${this.basePath}/checklist`
        );
        return response.data;
    }

    // Get single document by ID
    async getById(id: string): Promise<SupplierDocument> {
        const response = await api.get<SupplierDocument>(
            `${this.basePath}/${id}`
        );
        return response.data;
    }

    // Create document placeholder (without file)
    async create(dto: CreateSupplierDocumentDto): Promise<SupplierDocument> {
        const response = await api.post<SupplierDocument>(this.basePath, dto);
        return response.data;
    }

    // Create document with file upload
    async createWithFile(
        dto: CreateSupplierDocumentDto,
        file: File
    ): Promise<SupplierDocument> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', dto.type);
        if (dto.competenceMonth) formData.append('competenceMonth', String(dto.competenceMonth));
        if (dto.competenceYear) formData.append('competenceYear', String(dto.competenceYear));
        if (dto.expiresAt) formData.append('expiresAt', dto.expiresAt);
        if (dto.notes) formData.append('notes', dto.notes);

        const response = await api.post<SupplierDocument>(
            `${this.basePath}/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    }

    // Upload/replace file for existing document
    async uploadFile(id: string, file: File): Promise<SupplierDocument> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.patch<SupplierDocument>(
            `${this.basePath}/${id}/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    }

    // Update document metadata
    async update(id: string, dto: UpdateSupplierDocumentDto): Promise<SupplierDocument> {
        const response = await api.patch<SupplierDocument>(
            `${this.basePath}/${id}`,
            dto
        );
        return response.data;
    }

    // Delete document
    async delete(id: string): Promise<void> {
        await api.delete(`${this.basePath}/${id}`);
    }
}

export const supplierDocumentsService = new SupplierDocumentsService();
