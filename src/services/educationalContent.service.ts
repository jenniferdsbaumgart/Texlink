import api from './api';
import type { EducationalContent, EducationalContentType, EducationalContentCategory, EducationalContentCategoryCount } from '../types';

export interface CreateEducationalContentDto {
    title: string;
    description: string;
    contentType: EducationalContentType;
    contentUrl: string;
    thumbnailUrl?: string;
    category: EducationalContentCategory;
    duration?: string;
    isActive?: boolean;
    displayOrder?: number;
}

export interface UpdateEducationalContentDto extends Partial<CreateEducationalContentDto> {}

class EducationalContentService {
    private readonly basePath = '/educational-content';

    // ========== PUBLIC ENDPOINTS ==========

    // Get all active educational contents (for suppliers)
    async getAll(category?: EducationalContentCategory, contentType?: EducationalContentType): Promise<EducationalContent[]> {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (contentType) params.append('type', contentType);

        const response = await api.get<EducationalContent[]>(
            `${this.basePath}?${params.toString()}`
        );
        return response.data;
    }

    // Get categories with counts
    async getCategories(): Promise<EducationalContentCategoryCount[]> {
        const response = await api.get<EducationalContentCategoryCount[]>(
            `${this.basePath}/categories`
        );
        return response.data;
    }

    // Get content by ID
    async getById(id: string): Promise<EducationalContent> {
        const response = await api.get<EducationalContent>(`${this.basePath}/${id}`);
        return response.data;
    }

    // ========== ADMIN ENDPOINTS ==========

    // Get all educational contents (admin)
    async getAllAdmin(
        category?: EducationalContentCategory,
        contentType?: EducationalContentType,
        isActive?: boolean,
    ): Promise<EducationalContent[]> {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (contentType) params.append('type', contentType);
        if (isActive !== undefined) params.append('isActive', String(isActive));

        const response = await api.get<EducationalContent[]>(
            `${this.basePath}/admin/all?${params.toString()}`
        );
        return response.data;
    }

    // Get content by ID (admin)
    async getByIdAdmin(id: string): Promise<EducationalContent> {
        const response = await api.get<EducationalContent>(`${this.basePath}/admin/${id}`);
        return response.data;
    }

    // Create educational content
    async create(dto: CreateEducationalContentDto): Promise<EducationalContent> {
        const response = await api.post<EducationalContent>(`${this.basePath}/admin`, dto);
        return response.data;
    }

    // Update educational content
    async update(id: string, dto: UpdateEducationalContentDto): Promise<EducationalContent> {
        const response = await api.patch<EducationalContent>(
            `${this.basePath}/admin/${id}`,
            dto
        );
        return response.data;
    }

    // Delete educational content
    async delete(id: string): Promise<void> {
        await api.delete(`${this.basePath}/admin/${id}`);
    }

    // Toggle active status
    async toggleActive(id: string): Promise<EducationalContent> {
        const response = await api.patch<EducationalContent>(
            `${this.basePath}/admin/${id}/toggle`
        );
        return response.data;
    }

    // Update display order
    async updateOrder(items: { id: string; displayOrder: number }[]): Promise<void> {
        await api.patch(`${this.basePath}/admin/order`, items);
    }
}

export const educationalContentService = new EducationalContentService();
