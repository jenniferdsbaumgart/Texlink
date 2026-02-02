import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ValidationService } from './validation.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationService } from '../../integrations/services/integration.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { SupplierCredentialStatus, ValidationSource } from '@prisma/client';

describe('ValidationService', () => {
  let service: ValidationService;
  let prisma: PrismaService;
  let integrationService: IntegrationService;
  let cacheManager: any;
  let notificationsService: NotificationsService;

  const mockPrismaService = {
    supplierCredential: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    credentialValidation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    credentialStatusHistory: {
      create: jest.fn(),
    },
  };

  const mockIntegrationService = {
    validateCNPJ: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockNotificationsService = {
    notifyBrandValidationComplete: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    companyId: 'brand-123',
    brandId: 'brand-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: IntegrationService,
          useValue: mockIntegrationService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
    prisma = module.get<PrismaService>(PrismaService);
    integrationService = module.get<IntegrationService>(IntegrationService);
    cacheManager = module.get(CACHE_MANAGER);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processValidation', () => {
    const mockCredential = {
      id: 'cred-123',
      cnpj: '12345678000190',
      status: SupplierCredentialStatus.PENDING_VALIDATION,
      brandId: 'brand-123',
    };

    beforeEach(() => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        mockCredential,
      );
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
      mockPrismaService.supplierCredential.update.mockResolvedValue({});
      mockNotificationsService.notifyBrandValidationComplete.mockResolvedValue(
        {},
      );
    });

    it('should use cached validation if available', async () => {
      const cachedResult = {
        isValid: true,
        data: {
          razaoSocial: 'Empresa Teste',
          situacao: 'ATIVA',
        },
      };

      mockCacheManager.get.mockResolvedValue(cachedResult);
      mockPrismaService.credentialValidation.create.mockResolvedValue({
        id: 'validation-123',
      });

      const result = await service.processValidation('cred-123', 'user-123');

      expect(mockCacheManager.get).toHaveBeenCalledWith(
        'cnpj_validation:12345678000190',
      );
      expect(mockIntegrationService.validateCNPJ).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should call API and cache result if not cached', async () => {
      const apiResult = {
        isValid: true,
        source: 'BRASIL_API',
        data: {
          razaoSocial: 'Empresa Teste',
          situacao: 'ATIVA',
          nomeFantasia: 'Teste',
        },
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockIntegrationService.validateCNPJ.mockResolvedValue(apiResult);
      mockPrismaService.credentialValidation.create.mockResolvedValue({
        id: 'validation-123',
      });

      const result = await service.processValidation('cred-123', 'user-123');

      expect(mockIntegrationService.validateCNPJ).toHaveBeenCalledWith(
        '12345678000190',
      );
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'cnpj_validation:12345678000190',
        apiResult,
        expect.any(Number),
      );
      expect(result.success).toBe(true);
    });

    it('should update status to PENDING_COMPLIANCE on success', async () => {
      const apiResult = {
        isValid: true,
        source: 'BRASIL_API',
        data: {
          razaoSocial: 'Empresa Teste',
          situacao: 'ATIVA',
        },
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockIntegrationService.validateCNPJ.mockResolvedValue(apiResult);
      mockPrismaService.credentialValidation.create.mockResolvedValue({
        id: 'validation-123',
      });

      await service.processValidation('cred-123', 'user-123');

      expect(
        mockPrismaService.credentialStatusHistory.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          toStatus: SupplierCredentialStatus.PENDING_COMPLIANCE,
        }),
      });
    });

    it('should update status to VALIDATION_FAILED on error', async () => {
      const apiResult = {
        isValid: false,
        error: 'CNPJ não encontrado',
        source: 'BRASIL_API',
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockIntegrationService.validateCNPJ.mockResolvedValue(apiResult);
      mockPrismaService.credentialValidation.create.mockResolvedValue({
        id: 'validation-123',
      });

      const result = await service.processValidation('cred-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('CNPJ não encontrado');
      expect(
        mockPrismaService.credentialStatusHistory.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          toStatus: SupplierCredentialStatus.VALIDATION_FAILED,
        }),
      });
    });

    it('should send notification on success', async () => {
      const apiResult = {
        isValid: true,
        source: 'BRASIL_API',
        data: {
          razaoSocial: 'Empresa Teste',
          situacao: 'ATIVA',
        },
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockIntegrationService.validateCNPJ.mockResolvedValue(apiResult);
      mockPrismaService.credentialValidation.create.mockResolvedValue({
        id: 'validation-123',
      });

      await service.processValidation('cred-123', 'user-123');

      expect(
        mockNotificationsService.notifyBrandValidationComplete,
      ).toHaveBeenCalledWith('cred-123', true);
    });

    it('should send notification on failure', async () => {
      const apiResult = {
        isValid: false,
        error: 'CNPJ inválido',
        source: 'BRASIL_API',
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockIntegrationService.validateCNPJ.mockResolvedValue(apiResult);
      mockPrismaService.credentialValidation.create.mockResolvedValue({
        id: 'validation-123',
      });

      await service.processValidation('cred-123', 'user-123');

      expect(
        mockNotificationsService.notifyBrandValidationComplete,
      ).toHaveBeenCalledWith('cred-123', false);
    });

    it('should handle API errors gracefully', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockIntegrationService.validateCNPJ.mockRejectedValue(
        new Error('API timeout'),
      );
      mockPrismaService.credentialValidation.create.mockResolvedValue({
        id: 'validation-123',
      });

      const result = await service.processValidation('cred-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API timeout');
    });
  });

  describe('checkDuplicateCNPJ', () => {
    it('should return true if duplicate exists', async () => {
      mockPrismaService.supplierCredential.findFirst.mockResolvedValue({
        id: 'existing-cred',
        cnpj: '12345678000190',
      });

      const isDuplicate = await service.checkDuplicateCNPJ(
        '12.345.678/0001-90',
        'brand-123',
      );

      expect(isDuplicate).toBe(true);
    });

    it('should return false if no duplicate', async () => {
      mockPrismaService.supplierCredential.findFirst.mockResolvedValue(null);

      const isDuplicate = await service.checkDuplicateCNPJ(
        '12.345.678/0001-90',
        'brand-123',
      );

      expect(isDuplicate).toBe(false);
    });

    it('should exclude specified credential ID', async () => {
      mockPrismaService.supplierCredential.findFirst.mockResolvedValue(null);

      await service.checkDuplicateCNPJ(
        '12.345.678/0001-90',
        'brand-123',
        'cred-to-exclude',
      );

      expect(
        mockPrismaService.supplierCredential.findFirst,
      ).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: { not: 'cred-to-exclude' },
        }),
      });
    });
  });

  describe('getValidations', () => {
    it('should return validation history for credential', async () => {
      const mockCredential = {
        id: 'cred-123',
        brandId: 'brand-123',
      };

      const mockValidations = [
        {
          id: 'val-1',
          source: ValidationSource.RECEITA_FEDERAL,
          isValid: true,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        mockCredential,
      );
      mockPrismaService.credentialValidation.findMany.mockResolvedValue(
        mockValidations,
      );

      const result = await service.getValidations('cred-123', 'brand-123');

      expect(result).toEqual(mockValidations);
      expect(
        mockPrismaService.credentialValidation.findMany,
      ).toHaveBeenCalledWith({
        where: { credentialId: 'cred-123' },
        orderBy: { createdAt: 'desc' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if credential not found', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(null);

      await expect(
        service.getValidations('cred-123', 'brand-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('revalidate', () => {
    const mockCredential = {
      id: 'cred-123',
      cnpj: '12345678000190',
      status: SupplierCredentialStatus.VALIDATION_FAILED,
      brandId: 'brand-123',
    };

    it('should increment retry count on previous validations', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue(
        mockCredential,
      );
      mockPrismaService.credentialValidation.updateMany.mockResolvedValue({});
      mockPrismaService.credentialStatusHistory.create.mockResolvedValue({});
      mockPrismaService.supplierCredential.update.mockResolvedValue({});

      mockCacheManager.get.mockResolvedValue(null);
      mockIntegrationService.validateCNPJ.mockResolvedValue({
        isValid: true,
        data: { razaoSocial: 'Test' },
      });
      mockPrismaService.credentialValidation.create.mockResolvedValue({});
      mockNotificationsService.notifyBrandValidationComplete.mockResolvedValue(
        {},
      );

      await service.revalidate('cred-123', mockUser);

      expect(
        mockPrismaService.credentialValidation.updateMany,
      ).toHaveBeenCalledWith({
        where: { credentialId: 'cred-123' },
        data: { retryCount: { increment: 1 } },
      });
    });

    it('should throw BadRequestException if status not allowed', async () => {
      mockPrismaService.supplierCredential.findUnique.mockResolvedValue({
        ...mockCredential,
        status: SupplierCredentialStatus.ACTIVE,
      });

      await expect(service.revalidate('cred-123', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
