import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import {
  ICNPJProvider,
  CNPJValidationResult,
  CNPJData,
  CNPJAtividade,
  CNPJSocio,
} from './cnpj-provider.interface';

/**
 * Provider de CNPJ usando a ReceitaWS (fallback)
 * https://www.receitaws.com.br/
 *
 * Prioridade 2 - Fallback quando Brasil API falha
 *
 * Nota: A versão gratuita tem limite de 3 consultas/minuto
 * Para produção, recomenda-se adquirir um plano pago
 */
@Injectable()
export class ReceitaWsProvider implements ICNPJProvider {
  readonly name = 'RECEITA_WS';
  readonly priority = 2;

  private readonly logger = new Logger(ReceitaWsProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs = 15000; // 15 segundos

  // CNPJ do Banco do Brasil para teste de disponibilidade
  private readonly testCnpj = '00000000000191';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'RECEITAWS_URL',
      'https://receitaws.com.br/v1/cnpj',
    );
    this.apiKey = this.configService.get<string>('RECEITAWS_API_KEY');
  }

  /**
   * Verifica se o provider está disponível testando com CNPJ do Banco do Brasil
   */
  async isAvailable(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await firstValueFrom(
        this.httpService
          .get(`${this.baseUrl}/${this.testCnpj}`, {
            timeout: 5000,
            headers,
          })
          .pipe(
            timeout(5000),
            catchError(() => {
              throw new Error('Provider indisponível');
            }),
          ),
      );

      // ReceitaWS retorna 200 mesmo com erro, precisamos verificar o campo status
      const data = response.data as Record<string, unknown>;
      return response.status === 200 && data.status !== 'ERROR';
    } catch (error) {
      this.logger.warn('ReceitaWS indisponível para validação de CNPJ');
      return false;
    }
  }

  /**
   * Valida um CNPJ consultando a ReceitaWS
   */
  async validate(cnpj: string): Promise<CNPJValidationResult> {
    const cleanCnpj = this.cleanCnpj(cnpj);

    if (!this.isValidCnpjFormat(cleanCnpj)) {
      return {
        isValid: false,
        error: 'CNPJ inválido. Deve conter 14 dígitos numéricos.',
        source: this.name,
        timestamp: new Date(),
      };
    }

    try {
      this.logger.log(
        `Validando CNPJ ${this.maskCnpj(cleanCnpj)} via ReceitaWS`,
      );

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await firstValueFrom(
        this.httpService
          .get<Record<string, unknown>>(`${this.baseUrl}/${cleanCnpj}`, {
            timeout: this.timeoutMs,
            headers,
          })
          .pipe(timeout(this.timeoutMs)),
      );

      const rawData = response.data;

      // ReceitaWS retorna 200 mesmo quando há erro
      if (rawData.status === 'ERROR') {
        const errorMessage = (rawData.message ||
          'Erro ao consultar CNPJ') as string;
        this.logger.warn(`ReceitaWS retornou erro: ${errorMessage}`);

        return {
          isValid: false,
          error: errorMessage,
          source: this.name,
          timestamp: new Date(),
          rawResponse: rawData,
        };
      }

      const data = this.parseResponse(rawData);

      this.logger.log(
        `CNPJ ${this.maskCnpj(cleanCnpj)} validado - Situação: ${data.situacao}`,
      );

      return {
        isValid: data.situacao === 'ATIVA',
        data,
        source: this.name,
        timestamp: new Date(),
        rawResponse: rawData,
      };
    } catch (error) {
      const errorMessage = this.handleError(error, cleanCnpj);
      this.logger.error(
        `Erro ao validar CNPJ ${this.maskCnpj(cleanCnpj)}: ${errorMessage}`,
      );

      return {
        isValid: false,
        error: errorMessage,
        source: this.name,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Transforma a resposta da API no formato padronizado CNPJData
   */
  private parseResponse(raw: Record<string, unknown>): CNPJData {
    // Parser para atividades
    const parseAtividade = (
      atv: Record<string, string> | null,
    ): CNPJAtividade => {
      if (!atv) return { codigo: '', descricao: '' };
      return {
        codigo: atv.code || atv.codigo || '',
        descricao: atv.text || atv.descricao || '',
      };
    };

    // Parser para sócios (QSA)
    const parseSocio = (socio: Record<string, unknown>): CNPJSocio => ({
      nome: (socio.nome || '') as string,
      qualificacao: (socio.qual || '') as string,
      paisOrigem: (socio.pais_origem || '') as string,
      representanteLegal: socio.nome_rep_legal
        ? {
            nome: socio.nome_rep_legal as string,
            qualificacao: (socio.qual_rep_legal || '') as string,
          }
        : undefined,
    });

    // Atividade principal
    const atividadePrincipal =
      Array.isArray(raw.atividade_principal) &&
      raw.atividade_principal.length > 0
        ? parseAtividade(raw.atividade_principal[0] as Record<string, string>)
        : { codigo: '', descricao: '' };

    // Atividades secundárias
    const atividadesSecundarias = Array.isArray(raw.atividades_secundarias)
      ? (raw.atividades_secundarias as Record<string, string>[]).map(
          parseAtividade,
        )
      : [];

    // Sócios (QSA)
    const socios = Array.isArray(raw.qsa)
      ? (raw.qsa as Record<string, unknown>[]).map(parseSocio)
      : [];

    // Situação cadastral
    const situacao = ((raw.situacao || '') as string).toUpperCase();

    // Dados do Simples Nacional
    const simplesData = raw.simples as Record<string, unknown> | undefined;
    const simeiData = raw.simei as Record<string, unknown> | undefined;

    return {
      cnpj: this.formatCnpj((raw.cnpj || '') as string),
      razaoSocial: (raw.nome || '') as string,
      nomeFantasia: (raw.fantasia || undefined) as string | undefined,
      situacao,
      dataSituacao: (raw.data_situacao || '') as string,
      motivoSituacao: (raw.motivo_situacao || '') as string,
      dataAbertura: (raw.abertura || '') as string,
      naturezaJuridica: (raw.natureza_juridica || '') as string,
      capitalSocial: this.parseCapitalSocial(
        (raw.capital_social || '0') as string,
      ),
      porte: (raw.porte || '') as string,
      endereco: {
        logradouro: (raw.logradouro || '') as string,
        numero: (raw.numero || '') as string,
        complemento: (raw.complemento || undefined) as string | undefined,
        bairro: (raw.bairro || '') as string,
        municipio: (raw.municipio || '') as string,
        uf: (raw.uf || '') as string,
        cep: this.formatCep((raw.cep || '') as string),
      },
      atividadePrincipal,
      atividadesSecundarias,
      telefone: (raw.telefone || undefined) as string | undefined,
      email: ((raw.email || '') as string).toLowerCase() || undefined,
      socios,
      efr: (raw.efr || undefined) as string | undefined,
      optanteSimples: simplesData?.optante === 'Sim',
      dataOpcaoSimples: simplesData?.data_opcao as string | undefined,
      optanteMEI: simeiData?.optante === 'Sim',
    };
  }

  /**
   * Parse do capital social no formato brasileiro (1.000.000,00)
   */
  private parseCapitalSocial(value: string): number {
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Remove caracteres não numéricos do CNPJ
   */
  private cleanCnpj(cnpj: string): string {
    return cnpj.replace(/\D/g, '');
  }

  /**
   * Valida o formato básico do CNPJ (14 dígitos)
   */
  private isValidCnpjFormat(cnpj: string): boolean {
    return /^\d{14}$/.test(cnpj);
  }

  /**
   * Formata o CNPJ no padrão XX.XXX.XXX/XXXX-XX
   */
  private formatCnpj(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return cnpj;
    return clean.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5',
    );
  }

  /**
   * Mascara o CNPJ para logs
   */
  private maskCnpj(cnpj: string): string {
    if (cnpj.length !== 14) return cnpj;
    return `${cnpj.slice(0, 5)}.***/****-**`;
  }

  /**
   * Formata o CEP no padrão XXXXX-XXX
   */
  private formatCep(cep: string): string {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return cep;
    return clean.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }

  /**
   * Trata erros da requisição HTTP
   */
  private handleError(error: unknown, cnpj: string): string {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const data = error.response?.data as Record<string, unknown> | undefined;

      if (status === 429) {
        return 'Limite de consultas excedido. Aguarde 1 minuto para nova consulta';
      }
      if (status === 504) {
        return 'Timeout na consulta à Receita Federal';
      }
      if (status === 500 || status === 502 || status === 503) {
        return 'Serviço temporariamente indisponível';
      }

      if (data?.message) {
        return data.message as string;
      }

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return 'Timeout na consulta. A Receita Federal pode estar lenta';
      }
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return 'Não foi possível conectar ao serviço de validação';
      }

      return `Erro na consulta: ${error.message || 'Erro desconhecido'}`;
    }

    if (error instanceof Error && error.message?.includes('timeout')) {
      return 'Timeout na consulta. A Receita Federal pode estar lenta';
    }

    return 'Erro desconhecido ao consultar CNPJ';
  }
}
