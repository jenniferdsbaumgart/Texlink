import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SupplierCredentialStatus } from '@prisma/client';

describe('CredentialsService', () => {
    let service: CredentialsService;
    let prisma: PrismaService;

    const mockPrismaService = {
        supplierCredential: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            groupBy: jest.fn(),
        },
        credentialStatusHistory: {
            create: jest.fn(),
        },
        credentialValidation: {
            updateMany: jest.fn(),
        },
    };

    const mockUser = {
        id: 'user-123',
        companyId: 'brand-123',
        brandId: 'brand-123',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CredentialsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<CredentialsService>(CredentialsService);
        prisma = module.get<PrismaService>(PrismaService);

        // Reset mocks
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        const validDto = {
            cnpj: '12.345.678/0001-90',
            contactName: 'João Silva',
            contactEmail: 'joao@example.com',
            contactPhone: '(11) 98765-4321',
        };

        it('should create a new credential successfully', async () => {
            // Mock no existing credential
            mockPrismaService.supplierCredential.findFirst.mockResolvedValue(null);

            // Mock successful creation
            const mockCreated = {
                id: 'cred-123',
                cnpj: '12345678000190',
                ...validDto,
                status: SupplierCredentialStatus.DRAFT,
                brand: { id: 'brand-123', tradeName: 'Marca Teste' },
                createdBy: { id: 'user-123', name: 'User Test' },
            };
            mockPrismaService.supplierCredential.create.mockResolvedValue(mockCreated);
            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

            const result = await service.create(validDto, mockUser);

            expect(result).toEqual(mockCreated);
            expect(mockPrismaService.supplierCredential.findFirst).toHaveBeenCalledWith({
                where: {
                    brandId: 'brand-123',
                    cnpj: '12345678000190',
                    status: { notIn: [SupplierCredentialStatus.BLOCKED] },
                },
            });
            expect(mockPrismaService.supplierCredential.create).toHaveBeenCalled();
            expect(mockPrismaService.credentialStatusHistory.create).toHaveBeenCalled();
        });

        it('should throw ConflictException if CNPJ already exists for brand', async () => {
            // Mock existing credential
            mockPrismaService.supplierCredential.findFirst.mockResolvedValue({
                id: 'existing-123',
                cnpj: '12345678000190',
            });

            await expect(service.create(validDto, mockUser)).rejects.toThrow(
                ConflictException,
            );
            expect(mockPrismaService.supplierCredential.create).not.toHaveBeenCalled();
        });

        it('should clean CNPJ formatting', async () => {
            mockPrismaService.supplierCredential.findFirst.mockResolvedValue(null);
            mockPrismaService.supplierCredential.create.mockResolvedValue({
                id: 'cred-123',
                cnpj: '12345678000190',
            });
            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

            await service.create(
                { ...validDto, cnpj: '12.345.678/0001-90' },
                mockUser,
            );

            const createCall = mockPrismaService.supplierCredential.create.mock.calls[0][0];
            expect(createCall.data.cnpj).toBe('12345678000190');
        });
    });

    describe('update', () => {
        const existingCredential = {
            id: 'cred-123',
            cnpj: '12345678000190',
            status: SupplierCredentialStatus.DRAFT,
            brandId: 'brand-123',
            contactName: 'Old Name',
            contactEmail: 'old@example.com',
        };

        beforeEach(() => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
                existingCredential,
            );
        });

        it('should update credential in DRAFT status', async () => {
            const updateDto = {
                contactName: 'New Name',
                contactEmail: 'new@example.com',
            };

            mockPrismaService.supplierCredential.update.mockResolvedValue({
                ...existingCredential,
                ...updateDto,
            });

            const result = await service.update('cred-123', updateDto, mockUser);

            expect(result.contactName).toBe('New Name');
            expect(mockPrismaService.supplierCredential.update).toHaveBeenCalled();
        });

        it('should throw BadRequestException if status does not allow editing', async () => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                ...existingCredential,
                status: SupplierCredentialStatus.ACTIVE,
            });

            await expect(
                service.update('cred-123', { contactName: 'New' }, mockUser),
            ).rejects.toThrow(BadRequestException);
        });

        it('should reset validations if CNPJ changes', async () => {
            const updateDto = {
                cnpj: '98765432000100',
            };

            mockPrismaService.supplierCredential.findFirst.mockResolvedValue(null);
            mockPrismaService.supplierCredential.update.mockResolvedValue({
                ...existingCredential,
                cnpj: '98765432000100',
            });
            mockPrismaService.credentialValidation.updateMany.mockResolvedValue({});
            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});

            await service.update('cred-123', updateDto, mockUser);

            expect(mockPrismaService.credentialValidation.updateMany).toHaveBeenCalledWith({
                where: { credentialId: 'cred-123' },
                data: { isValid: false },
            });
        });

        it('should detect duplicate CNPJ when updating', async () => {
            const updateDto = {
                cnpj: '98765432000100',
            };

            // Mock another credential with same CNPJ
            mockPrismaService.supplierCredential.findFirst.mockResolvedValue({
                id: 'other-cred',
                cnpj: '98765432000100',
            });

            await expect(
                service.update('cred-123', updateDto, mockUser),
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('remove', () => {
        it('should soft delete credential in DRAFT status', async () => {
            const credential = {
                id: 'cred-123',
                status: SupplierCredentialStatus.DRAFT,
                brandId: 'brand-123',
            };

            mockPrismaService.supplierCredential.findUnique.mockResolvedValue(credential);
            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
            mockPrismaService.supplierCredential.update.mockResolvedValue({
                ...credential,
                status: SupplierCredentialStatus.BLOCKED,
            });

            const result = await service.remove('cred-123', mockUser);

            expect(result.success).toBe(true);
            expect(mockPrismaService.supplierCredential.update).toHaveBeenCalledWith({
                where: { id: 'cred-123' },
                data: { status: SupplierCredentialStatus.BLOCKED },
            });
        });

        it('should throw BadRequestException if status does not allow removal', async () => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                id: 'cred-123',
                status: SupplierCredentialStatus.ACTIVE,
                brandId: 'brand-123',
            });

            await expect(service.remove('cred-123', mockUser)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe('getStats', () => {
        it('should return correct statistics', async () => {
            mockPrismaService.supplierCredential.groupBy.mockResolvedValue([
                { status: SupplierCredentialStatus.DRAFT, _count: { id: 5 } },
                { status: SupplierCredentialStatus.ACTIVE, _count: { id: 10 } },
            ]);

            mockPrismaService.supplierCredential.count
                .mockResolvedValueOnce(3) // thisMonth
                .mockResolvedValueOnce(2) // completedThisMonth
                .mockResolvedValueOnce(5) // pendingAction
                .mockResolvedValueOnce(7); // awaitingResponse

            const stats = await service.getStats('brand-123');

            expect(stats.total).toBe(15);
            expect(stats.activeCount).toBe(10);
            expect(stats.byStatus[SupplierCredentialStatus.DRAFT]).toBe(5);
            expect(stats.byStatus[SupplierCredentialStatus.ACTIVE]).toBe(10);
            expect(stats.conversionRate).toBeCloseTo(66.67, 1);
        });
    });

    describe('changeStatus', () => {
        it('should change status and create history record', async () => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                id: 'cred-123',
                status: SupplierCredentialStatus.DRAFT,
            });

            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
            mockPrismaService.supplierCredential.update.mockResolvedValue({
                id: 'cred-123',
                status: SupplierCredentialStatus.PENDING_VALIDATION,
            });

            await service.changeStatus(
                'cred-123',
                SupplierCredentialStatus.PENDING_VALIDATION,
                'user-123',
                'Test reason',
            );

            expect(mockPrismaService.credentialStatusHistory.create).toHaveBeenCalledWith({
                data: {
                    credentialId: 'cred-123',
                    fromStatus: SupplierCredentialStatus.DRAFT,
                    toStatus: SupplierCredentialStatus.PENDING_VALIDATION,
                    performedById: 'user-123',
                    reason: 'Test reason',
                },
            });

            expect(mockPrismaService.supplierCredential.update).toHaveBeenCalledWith({
                where: { id: 'cred-123' },
                data: expect.objectContaining({
                    status: SupplierCredentialStatus.PENDING_VALIDATION,
                }),
            });
        });

        it('should set completedAt when status becomes ACTIVE', async () => {
            mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
                id: 'cred-123',
                status: SupplierCredentialStatus.CONTRACT_SIGNED,
            });

            mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
            mockPrismaService.supplierCredential.update.mockResolvedValue({});

            await service.changeStatus(
                'cred-123',
                SupplierCredentialStatus.ACTIVE,
                'user-123',
            );

            const updateCall = mockPrismaService.supplierCredential.update.mock.calls[0][0];
            expect(updateCall.data.completedAt).toBeDefined();
        });
    });
});
