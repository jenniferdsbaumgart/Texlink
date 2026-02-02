import { RiskLevel } from '@prisma/client';

// Registro de pendência/negativação
export interface CreditNegative {
  tipo: string; // PEFIN, REFIN, CCF, etc.
  valor: number;
  dataOcorrencia: string;
  credor?: string;
  contrato?: string;
  cidade?: string;
  uf?: string;
}

// Registro de protesto
export interface CreditProtesto {
  valor: number;
  dataProtesto: string;
  cartorio: string;
  cidade: string;
  uf: string;
}

// Registro de cheque sem fundo
export interface CreditChequeSemFundo {
  quantidade: number;
  dataUltimaOcorrencia: string;
  banco?: string;
  motivo?: string; // Motivo 12, 13, 14
}

// Resumo financeiro da empresa
export interface CreditSummary {
  totalDividas: number;
  quantidadeNegativacoes: number;
  quantidadeProtestos: number;
  quantidadeChequesSemFundo: number;
  maiorDivida: number;
  dividaMaisAntiga?: string;
  dividaMaisRecente?: string;
}

// Resultado da análise de crédito
export interface CreditAnalysisResult {
  /** Score de crédito (0-1000, onde 1000 é excelente) */
  score: number;

  /** Nível de risco calculado */
  riskLevel: RiskLevel;

  /** Se possui negativações ativas */
  hasNegatives: boolean;

  /** Lista de negativações encontradas */
  negatives?: CreditNegative[];

  /** Lista de protestos encontrados */
  protestos?: CreditProtesto[];

  /** Informações sobre cheques sem fundo */
  chequesSemFundo?: CreditChequeSemFundo[];

  /** Resumo financeiro */
  summary?: CreditSummary;

  /** Recomendações baseadas na análise */
  recommendations: string[];

  /** Nome do provider que fez a análise */
  source: string;

  /** Timestamp da análise */
  timestamp: Date;

  /** Resposta bruta para auditoria */
  rawResponse?: Record<string, unknown>;

  /** Mensagem de erro, se houver */
  error?: string;
}

// Interface que todos os providers de crédito devem implementar
export interface ICreditProvider {
  /** Nome único do provider */
  readonly name: string;

  /**
   * Analisa o crédito de uma empresa pelo CNPJ
   * @param cnpj CNPJ formatado ou não
   */
  analyze(cnpj: string): Promise<CreditAnalysisResult>;

  /**
   * Verifica se o provider está disponível/configurado
   */
  isAvailable(): Promise<boolean>;
}

// Token de injeção para os providers
export const CREDIT_PROVIDERS = 'CREDIT_PROVIDERS';
