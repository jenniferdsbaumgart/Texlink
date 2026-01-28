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
 * Provider de CNPJ usando a Brasil API (gratuita)
 * https://brasilapi.com.br/docs#tag/CNPJ
 * 
 * Prioridade 1 - API gratuita e confiável
 */
@Injectable()
export class BrasilApiProvider implements ICNPJProvider {
    readonly name = 'BRASIL_API';
    readonly priority = 1;

    private readonly logger = new Logger(BrasilApiProvider.name);
    private readonly baseUrl = 'https://brasilapi.com.br/api/cnpj/v1';
    private readonly timeoutMs = 10000; // 10 segundos

    // CNPJ do Banco do Brasil para teste de disponibilidade
    private readonly testCnpj = '00000000000191';

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Verifica se o provider está disponível testando com CNPJ do Banco do Brasil
     */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.baseUrl}/${this.testCnpj}`, {
                    timeout: 5000, // 5 segundos para teste
                }).pipe(
                    timeout(5000),
                    catchError(() => {
                        throw new Error('Provider indisponível');
                    }),
                ),
            );

            return response.status === 200;
        } catch (error) {
            this.logger.warn('Brasil API indisponível para validação de CNPJ');
            return false;
        }
    }

    /**
     * Valida um CNPJ consultando a Brasil API
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
            this.logger.log(`Validando CNPJ ${this.maskCnpj(cleanCnpj)} via Brasil API`);

            const response = await firstValueFrom(
                this.httpService.get<Record<string, unknown>>(`${this.baseUrl}/${cleanCnpj}`, {
                    timeout: this.timeoutMs,
                    headers: {
                        'Accept': 'application/json',
                    },
                }).pipe(
                    timeout(this.timeoutMs),
                ),
            );

            const rawData = response.data;
            const data = this.parseResponse(rawData);

            this.logger.log(`CNPJ ${this.maskCnpj(cleanCnpj)} validado - Situação: ${data.situacao}`);

            return {
                isValid: data.situacao === 'ATIVA',
                data,
                source: this.name,
                timestamp: new Date(),
                rawResponse: rawData,
            };
        } catch (error) {
            const errorMessage = this.handleError(error, cleanCnpj);
            this.logger.error(`Erro ao validar CNPJ ${this.maskCnpj(cleanCnpj)}: ${errorMessage}`);

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
        const parseAtividade = (atv: Record<string, string> | null): CNPJAtividade => {
            if (!atv) return { codigo: '', descricao: '' };
            return {
                codigo: atv.codigo || atv.id?.toString() || '',
                descricao: atv.descricao || atv.texto || '',
            };
        };

        // Parser para sócios (QSA)
        const parseSocio = (socio: Record<string, unknown>): CNPJSocio => ({
            nome: (socio.nome_socio || socio.nome || '') as string,
            qualificacao: (socio.qualificacao_socio || socio.codigo_qualificacao_socio?.toString() || '') as string,
            cpfCnpj: (socio.cnpj_cpf_do_socio || '') as string,
            dataEntrada: (socio.data_entrada_sociedade || '') as string,
            paisOrigem: (socio.pais || '') as string,
            representanteLegal: socio.nome_representante_legal ? {
                nome: socio.nome_representante_legal as string,
                qualificacao: (socio.qualificacao_representante_legal || '') as string,
            } : undefined,
        });

        // Atividades secundárias
        const atividadesSecundarias = Array.isArray(raw.cnaes_secundarios)
            ? (raw.cnaes_secundarios as Record<string, string>[]).map(parseAtividade)
            : [];

        // Sócios (QSA)
        const socios = Array.isArray(raw.qsa)
            ? (raw.qsa as Record<string, unknown>[]).map(parseSocio)
            : [];

        // Situação cadastral
        const situacao = (
            (raw.descricao_situacao_cadastral as string) ||
            (raw.situacao_cadastral as string) ||
            ''
        ).toUpperCase();

        return {
            cnpj: this.formatCnpj((raw.cnpj || '') as string),
            razaoSocial: (raw.razao_social || '') as string,
            nomeFantasia: (raw.nome_fantasia || undefined) as string | undefined,
            situacao,
            dataSituacao: (raw.data_situacao_cadastral || '') as string,
            motivoSituacao: (raw.descricao_motivo_situacao_cadastral || '') as string,
            dataAbertura: (raw.data_inicio_atividade || '') as string,
            naturezaJuridica: (raw.natureza_juridica || '') as string,
            capitalSocial: this.parseDecimal(raw.capital_social),
            porte: (raw.porte || raw.descricao_porte || '') as string,
            endereco: {
                logradouro: this.buildLogradouro(raw),
                numero: (raw.numero || '') as string,
                complemento: (raw.complemento || undefined) as string | undefined,
                bairro: (raw.bairro || '') as string,
                municipio: (raw.municipio || '') as string,
                uf: (raw.uf || '') as string,
                cep: this.formatCep((raw.cep || '') as string),
            },
            atividadePrincipal: raw.cnae_fiscal
                ? {
                    codigo: (raw.cnae_fiscal as number).toString(),
                    descricao: (raw.cnae_fiscal_descricao || '') as string,
                }
                : { codigo: '', descricao: '' },
            atividadesSecundarias,
            telefone: this.formatTelefone(raw.ddd_telefone_1 as string),
            email: ((raw.email || '') as string).toLowerCase() || undefined,
            socios,
            optanteSimples: raw.opcao_pelo_simples === true,
            optanteMEI: raw.opcao_pelo_mei === true,
        };
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
     * Formata telefone com DDD
     */
    private formatTelefone(dddTelefone: string | undefined): string | undefined {
        if (!dddTelefone) return undefined;
        const clean = dddTelefone.replace(/\D/g, '');
        if (clean.length < 10) return undefined;
        return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    }

    /**
     * Constrói o logradouro completo (tipo + nome)
     */
    private buildLogradouro(raw: Record<string, unknown>): string {
        const tipo = (raw.descricao_tipo_de_logradouro || '') as string;
        const nome = (raw.logradouro || '') as string;
        return tipo ? `${tipo} ${nome}` : nome;
    }

    /**
     * Parse de valores decimais
     */
    private parseDecimal(value: unknown): number {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
            return parseFloat(cleaned) || 0;
        }
        return 0;
    }

    /**
     * Trata erros da requisição HTTP
     */
    private handleError(error: unknown, cnpj: string): string {
        if (error instanceof AxiosError) {
            const status = error.response?.status;
            const data = error.response?.data as Record<string, unknown> | undefined;

            if (status === 404) {
                return 'CNPJ não encontrado na base da Receita Federal';
            }
            if (status === 400) {
                return 'CNPJ inválido';
            }
            if (status === 429) {
                return 'Limite de requisições excedido. Tente novamente em alguns minutos';
            }
            if (status === 500 || status === 502 || status === 503) {
                return 'Serviço temporariamente indisponível. Tente novamente mais tarde';
            }

            if (data?.message) {
                return data.message as string;
            }

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                return 'Timeout na consulta. O serviço pode estar lento';
            }
            if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                return 'Não foi possível conectar ao serviço de validação';
            }

            return `Erro na consulta: ${error.message || 'Erro desconhecido'}`;
        }

        if (error instanceof Error && error.message?.includes('timeout')) {
            return 'Timeout na consulta. O serviço pode estar lento';
        }

        return 'Erro desconhecido ao consultar CNPJ';
    }
}
