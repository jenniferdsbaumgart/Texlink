import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { User } from './auth.service';

export interface UpdateProfileDto {
    name?: string;
    email?: string;
}

const mockUpdateProfile = async (data: UpdateProfileDto): Promise<User> => {
    await simulateDelay(500);

    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
        throw new Error('Nao autenticado');
    }

    const user = JSON.parse(storedUser);
    const updated = {
        ...user,
        ...(data.name && { name: data.name }),
        ...(data.email && { email: data.email }),
    };

    localStorage.setItem('user', JSON.stringify(updated));
    return updated as User;
};

export const profileService = {
    async updateProfile(data: UpdateProfileDto): Promise<User> {
        if (MOCK_MODE) {
            return mockUpdateProfile(data);
        }

        const response = await api.patch<User>('/auth/me', data);
        localStorage.setItem('user', JSON.stringify(response.data));
        return response.data;
    },
};
