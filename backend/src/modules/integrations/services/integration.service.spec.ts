import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IntegrationService } from './integration.service';
import { CacheService } from '../../../common/services/cache.service';
import { MockCreditProvider } from '../providers/credit/mock-credit.provider';
import { SerasaCreditProvider } from '../providers/credit/serasa.provider';
import { SPCCreditProvider } from '../providers/credit/spc.provider';
import { BrasilApiProvider } from '../providers/cnpj/brasil-api.provider';
import { ReceitaWsProvider } from '../providers/cnpj/receitaws.provider';
import { MockLegalProvider } from '../providers/legal/mock-legal.provider';
import { DatajudLegalProvider } from '../providers/legal/datajud.provider';
import { MockRestrictionsProvider } from '../providers/restrictions/mock-restrictions.provider';
import { PortalTransparenciaProvider } from '../providers/restrictions/portal-transparencia.provider';
import { SendGridProvider } from '../providers/notification/sendgrid.provider';
import { TwilioWhatsappProvider } from '../providers/notification/twilio-whatsapp.provider';
import { RiskLevel } from '@prisma/client';
import { CreditAnalysisResult } from '../providers/credit/credit-provider.interface';

// Valid test CNPJ (14 digits)
const TEST_CNPJ = '12345678000195';

// Helper to build a successful credit result
function buildCreditResult(
  source: string,
  overrides: Partial<CreditAnalysisResult> = {},
): CreditAnalysisResult {
  return {
    score: 750,
    riskLevel: RiskLevel.LOW,
    hasNegatives: false,
    recommendations: ['Good credit'],
    source,
    timestamp: new Date(),
    ...overrides,
  };
}

// Helper to build an error credit result
function buildErrorResult(
  source: string,
  errorMsg: string,
): CreditAnalysisResult {
  return {
    score: 0,
    riskLevel: RiskLevel.MEDIUM,
    hasNegatives: false,
    recommendations: [],
    source,
    timestamp: new Date(),
    error: errorMsg,
  };
}

describe('IntegrationService', () => {
  let service: IntegrationService;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;
  let mockCreditProvider: jest.Mocked<MockCreditProvider>;
  let serasaCreditProvider: jest.Mocked<SerasaCreditProvider>;
  let spcCreditProvider: jest.Mocked<SPCCreditProvider>;

  // Minimal mocks for non-credit providers (not under test)
  const brasilApiProvider = {
    name: 'BRASIL_API',
    priority: 1,
    isAvailable: jest.fn().mockResolvedValue(true),
    validate: jest.fn(),
  };
  const receitaWsProvider = {
    name: 'RECEITA_WS',
    priority: 2,
    isAvailable: jest.fn().mockResolvedValue(true),
    validate: jest.fn(),
  };
  const mockLegalProvider = {
    name: 'MOCK_LEGAL',
    isAvailable: jest.fn().mockResolvedValue(true),
    analyze: jest.fn(),
  };
  const datajudLegalProvider = {
    name: 'DATAJUD',
    isAvailable: jest.fn().mockResolvedValue(false),
    analyze: jest.fn(),
  };
  const mockRestrictionsProvider = {
    name: 'MOCK_RESTRICTIONS',
    isAvailable: jest.fn().mockResolvedValue(true),
    analyze: jest.fn(),
  };
  const portalTransparenciaProvider = {
    name: 'PORTAL_TRANSPARENCIA',
    isAvailable: jest.fn().mockResolvedValue(false),
    analyze: jest.fn(),
  };
  const sendGridProvider = {
    name: 'SENDGRID',
    isAvailable: jest.fn().mockResolvedValue(false),
    send: jest.fn(),
  };
  const twilioWhatsappProvider = {
    name: 'TWILIO_WHATSAPP',
    isAvailable: jest.fn().mockResolvedValue(false),
    send: jest.fn(),
  };

  beforeEach(async () => {
    // Create mocked credit providers
    serasaCreditProvider = {
      name: 'SERASA',
      isAvailable: jest.fn().mockResolvedValue(true),
      analyze: jest.fn(),
    } as any;

    spcCreditProvider = {
      name: 'SPC',
      isAvailable: jest.fn().mockResolvedValue(true),
      analyze: jest.fn(),
    } as any;

    mockCreditProvider = {
      name: 'MOCK_CREDIT',
      isAvailable: jest.fn().mockResolvedValue(true),
      analyze: jest.fn(),
    } as any;

    // Mock CacheService
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delByPrefix: jest.fn().mockResolvedValue(undefined),
      isUsingRedis: jest.fn().mockReturnValue(false),
    } as any;

    // Mock ConfigService
    configService = {
      get: jest.fn().mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return defaultVal ?? 'mock';
        return defaultVal;
      }),
    } as any;

    // Build service manually to control injection order
    service = new (IntegrationService as any)(
      configService,
      cacheService,
      brasilApiProvider,
      receitaWsProvider,
      mockCreditProvider,
      serasaCreditProvider,
      spcCreditProvider,
      mockLegalProvider,
      datajudLegalProvider,
      mockRestrictionsProvider,
      portalTransparenciaProvider,
      sendGridProvider,
      twilioWhatsappProvider,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== PROVIDER SELECTION ====================

  describe('Provider selection based on CREDIT_PROVIDER config', () => {
    it('should use mock provider when CREDIT_PROVIDER=mock', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'mock';
        return defaultVal;
      });

      const mockResult = buildCreditResult('MOCK_CREDIT');
      mockCreditProvider.analyze.mockResolvedValue(mockResult);

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(result).toBeTruthy();
      expect(result!.source).toBe('MOCK_CREDIT');
      expect(mockCreditProvider.analyze).toHaveBeenCalledWith(TEST_CNPJ);
    });

    it('should use Serasa provider when CREDIT_PROVIDER=serasa', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'serasa';
        return defaultVal;
      });

      const serasaResult = buildCreditResult('SERASA');
      serasaCreditProvider.analyze.mockResolvedValue(serasaResult);

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(result).toBeTruthy();
      expect(result!.source).toBe('SERASA');
      expect(serasaCreditProvider.analyze).toHaveBeenCalledWith(TEST_CNPJ);
    });

    it('should use SPC provider when CREDIT_PROVIDER=spc', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'spc';
        return defaultVal;
      });

      const spcResult = buildCreditResult('SPC');
      spcCreditProvider.analyze.mockResolvedValue(spcResult);

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(result).toBeTruthy();
      expect(result!.source).toBe('SPC');
      expect(spcCreditProvider.analyze).toHaveBeenCalledWith(TEST_CNPJ);
    });

    it('should return null for invalid CNPJ (less than 14 digits)', async () => {
      const result = await service.analyzeCredit('123');
      expect(result).toBeNull();
    });
  });

  // ==================== FALLBACK BEHAVIOR ====================

  describe('Fallback when primary provider fails', () => {
    it('should fallback to SPC when Serasa fails with error result', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'serasa';
        return defaultVal;
      });

      serasaCreditProvider.analyze.mockResolvedValue(
        buildErrorResult('SERASA', 'API timeout'),
      );

      const spcResult = buildCreditResult('SPC');
      spcCreditProvider.analyze.mockResolvedValue(spcResult);

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(result).toBeTruthy();
      expect(result!.source).toBe('SPC');
    });

    it('should fallback to SPC when Serasa throws exception', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'serasa';
        return defaultVal;
      });

      serasaCreditProvider.analyze.mockRejectedValue(
        new Error('Network error'),
      );

      const spcResult = buildCreditResult('SPC');
      spcCreditProvider.analyze.mockResolvedValue(spcResult);

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(result).toBeTruthy();
      expect(result!.source).toBe('SPC');
    });

    it('should fallback to Mock when both Serasa and SPC fail', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'serasa';
        return defaultVal;
      });

      serasaCreditProvider.analyze.mockRejectedValue(new Error('Serasa down'));
      spcCreditProvider.analyze.mockRejectedValue(new Error('SPC down'));

      const mockResult = buildCreditResult('MOCK_CREDIT');
      mockCreditProvider.analyze.mockResolvedValue(mockResult);

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(result).toBeTruthy();
      expect(result!.source).toBe('MOCK_CREDIT');
    });

    it('should return inline fallback when ALL providers fail', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'serasa';
        return defaultVal;
      });

      serasaCreditProvider.analyze.mockRejectedValue(new Error('down'));
      spcCreditProvider.analyze.mockRejectedValue(new Error('down'));
      mockCreditProvider.analyze.mockRejectedValue(new Error('down'));

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(result).toBeTruthy();
      expect(result!.source).toBe('FALLBACK_INLINE');
    });

    it('should skip unavailable providers', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'serasa';
        return defaultVal;
      });

      serasaCreditProvider.isAvailable.mockResolvedValue(false);
      spcCreditProvider.isAvailable.mockResolvedValue(false);

      const mockResult = buildCreditResult('MOCK_CREDIT');
      mockCreditProvider.analyze.mockResolvedValue(mockResult);

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(serasaCreditProvider.analyze).not.toHaveBeenCalled();
      expect(spcCreditProvider.analyze).not.toHaveBeenCalled();
      expect(result!.source).toBe('MOCK_CREDIT');
    });
  });

  // ==================== CACHING BEHAVIOR ====================

  describe('Caching behavior', () => {
    it('should return cached result on cache hit (source appended with _CACHED)', async () => {
      const cachedResult = buildCreditResult('SERASA');
      cacheService.get.mockResolvedValue(cachedResult);

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(result).toBeTruthy();
      expect(result!.source).toBe('SERASA_CACHED');
      // No provider should have been called
      expect(serasaCreditProvider.analyze).not.toHaveBeenCalled();
      expect(spcCreditProvider.analyze).not.toHaveBeenCalled();
      expect(mockCreditProvider.analyze).not.toHaveBeenCalled();
    });

    it('should call provider on cache miss and then cache the result', async () => {
      cacheService.get.mockResolvedValue(null);

      const mockResult = buildCreditResult('MOCK_CREDIT');
      mockCreditProvider.analyze.mockResolvedValue(mockResult);

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(result!.source).toBe('MOCK_CREDIT');
      expect(mockCreditProvider.analyze).toHaveBeenCalled();
      // Should have cached the result
      expect(cacheService.set).toHaveBeenCalledWith(
        `credit_analysis:${TEST_CNPJ}`,
        mockResult,
        30 * 24 * 60 * 60, // 30 days in seconds
      );
    });

    it('should bypass cache when forceRefresh=true', async () => {
      // Return rate limit = 0 for rate limit keys, cached result for credit key
      cacheService.get.mockImplementation(async (key: string) => {
        if (key.startsWith('rate_limit:')) return 0;
        return buildCreditResult('SERASA'); // would be returned on cache hit
      });

      const freshResult = buildCreditResult('MOCK_CREDIT');
      mockCreditProvider.analyze.mockResolvedValue(freshResult);

      const result = await service.analyzeCredit(TEST_CNPJ, true);

      expect(result!.source).toBe('MOCK_CREDIT');
      expect(mockCreditProvider.analyze).toHaveBeenCalled();
    });

    it('should not cache credit_analysis results with errors', async () => {
      cacheService.get.mockResolvedValue(null);

      // All providers return errors
      serasaCreditProvider.analyze.mockResolvedValue(
        buildErrorResult('SERASA', 'timeout'),
      );
      spcCreditProvider.analyze.mockResolvedValue(
        buildErrorResult('SPC', 'timeout'),
      );
      mockCreditProvider.analyze.mockResolvedValue(
        buildErrorResult('MOCK_CREDIT', 'error'),
      );

      const result = await service.analyzeCredit(TEST_CNPJ);

      // Should get fallback
      expect(result!.source).toBe('FALLBACK_INLINE');
      // cacheService.set IS called for rate_limit increments, but NOT for credit_analysis
      const creditCacheCalls = cacheService.set.mock.calls.filter(
        (call) => (call[0] as string).startsWith('credit_analysis:'),
      );
      expect(creditCacheCalls).toHaveLength(0);
    });
  });

  // ==================== RATE LIMITING ====================

  describe('Rate limiting behavior', () => {
    it('should allow calls when under the rate limit', async () => {
      // Rate limit counter at 50 (under 100)
      cacheService.get.mockImplementation(async (key: string) => {
        if (key.startsWith('rate_limit:')) return 50;
        return null; // cache miss for credit analysis
      });

      const mockResult = buildCreditResult('MOCK_CREDIT');
      mockCreditProvider.analyze.mockResolvedValue(mockResult);

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(result!.source).toBe('MOCK_CREDIT');
      expect(mockCreditProvider.analyze).toHaveBeenCalled();
    });

    it('should skip provider when rate limit is exceeded and fallback to next', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'serasa';
        return defaultVal;
      });

      // Serasa is rate-limited (100 calls), SPC and Mock are not
      cacheService.get.mockImplementation(async (key: string) => {
        if (key === 'rate_limit:credit:SERASA') return 100;
        if (key.startsWith('rate_limit:')) return 0;
        return null;
      });

      const spcResult = buildCreditResult('SPC');
      spcCreditProvider.analyze.mockResolvedValue(spcResult);

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(serasaCreditProvider.analyze).not.toHaveBeenCalled();
      expect(result!.source).toBe('SPC');
    });

    it('should skip all rate-limited providers and use inline fallback', async () => {
      cacheService.get.mockImplementation(async (key: string) => {
        if (key.startsWith('rate_limit:')) return 100; // all rate-limited
        return null;
      });

      const result = await service.analyzeCredit(TEST_CNPJ);

      expect(serasaCreditProvider.analyze).not.toHaveBeenCalled();
      expect(spcCreditProvider.analyze).not.toHaveBeenCalled();
      expect(mockCreditProvider.analyze).not.toHaveBeenCalled();
      expect(result!.source).toBe('FALLBACK_INLINE');
    });

    it('should increment rate limit counter after calling a provider', async () => {
      cacheService.get.mockResolvedValue(null);

      const mockResult = buildCreditResult('MOCK_CREDIT');
      mockCreditProvider.analyze.mockResolvedValue(mockResult);

      await service.analyzeCredit(TEST_CNPJ);

      // Should have called set to increment the counter
      expect(cacheService.set).toHaveBeenCalledWith(
        'rate_limit:credit:MOCK_CREDIT',
        1,
        3600,
      );
    });
  });

  // ==================== CIRCUIT BREAKER ====================

  describe('Circuit breaker behavior', () => {
    it('should open circuit after 5 consecutive failures', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'serasa';
        return defaultVal;
      });

      cacheService.get.mockResolvedValue(null);

      // Serasa fails every time, SPC succeeds
      serasaCreditProvider.analyze.mockRejectedValue(new Error('fail'));
      const spcResult = buildCreditResult('SPC');
      spcCreditProvider.analyze.mockResolvedValue(spcResult);

      // Fail 5 times to trip the circuit breaker
      for (let i = 0; i < 5; i++) {
        await service.analyzeCredit(TEST_CNPJ, true);
      }

      // Reset mock call counts to verify the 6th call
      serasaCreditProvider.analyze.mockClear();

      // 6th call: Serasa should be skipped due to open circuit
      const result = await service.analyzeCredit(TEST_CNPJ, true);

      expect(serasaCreditProvider.analyze).not.toHaveBeenCalled();
      expect(result!.source).toBe('SPC');
    });

    it('should reset circuit breaker on successful call', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'serasa';
        return defaultVal;
      });

      cacheService.get.mockResolvedValue(null);

      // First: fail 3 times
      serasaCreditProvider.analyze.mockRejectedValue(new Error('fail'));
      const spcResult = buildCreditResult('SPC');
      spcCreditProvider.analyze.mockResolvedValue(spcResult);

      for (let i = 0; i < 3; i++) {
        await service.analyzeCredit(TEST_CNPJ, true);
      }

      // Now Serasa succeeds
      const serasaResult = buildCreditResult('SERASA');
      serasaCreditProvider.analyze.mockResolvedValue(serasaResult);

      const result = await service.analyzeCredit(TEST_CNPJ, true);
      expect(result!.source).toBe('SERASA');

      // After success, fail again 4 more times (should not trip, since reset)
      serasaCreditProvider.analyze.mockRejectedValue(new Error('fail'));
      spcCreditProvider.analyze.mockResolvedValue(spcResult);

      for (let i = 0; i < 4; i++) {
        await service.analyzeCredit(TEST_CNPJ, true);
      }

      // Serasa should still have been attempted (circuit not tripped yet, only 4 failures)
      serasaCreditProvider.analyze.mockClear();
      await service.analyzeCredit(TEST_CNPJ, true);

      // 5th failure should trip it - after this call, analyze should have been called once more
      // The circuit opens on the 5th failure, so the 6th call skips
      serasaCreditProvider.analyze.mockClear();
      await service.analyzeCredit(TEST_CNPJ, true);
      expect(serasaCreditProvider.analyze).not.toHaveBeenCalled();
    });

    it('should allow half-open attempt after circuit breaker timeout expires', async () => {
      configService.get.mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'CREDIT_PROVIDER') return 'serasa';
        return defaultVal;
      });

      cacheService.get.mockResolvedValue(null);

      // Fail 5 times to trip circuit
      serasaCreditProvider.analyze.mockRejectedValue(new Error('fail'));
      const spcResult = buildCreditResult('SPC');
      spcCreditProvider.analyze.mockResolvedValue(spcResult);

      for (let i = 0; i < 5; i++) {
        await service.analyzeCredit(TEST_CNPJ, true);
      }

      // Verify circuit is open
      serasaCreditProvider.analyze.mockClear();
      await service.analyzeCredit(TEST_CNPJ, true);
      expect(serasaCreditProvider.analyze).not.toHaveBeenCalled();

      // Manipulate the circuit breaker state to simulate timeout expiry
      // Access private field for testing
      const circuitBreakers = (service as any).circuitBreakers as Map<
        string,
        { consecutiveFailures: number; openUntil: Date | null }
      >;
      const state = circuitBreakers.get('SERASA');
      expect(state).toBeTruthy();
      // Set openUntil to the past
      state!.openUntil = new Date(Date.now() - 1000);

      // Now Serasa should be tried again (half-open)
      const serasaResult = buildCreditResult('SERASA');
      serasaCreditProvider.analyze.mockResolvedValue(serasaResult);

      const result = await service.analyzeCredit(TEST_CNPJ, true);
      expect(result!.source).toBe('SERASA');
      expect(serasaCreditProvider.analyze).toHaveBeenCalled();
    });
  });
});
