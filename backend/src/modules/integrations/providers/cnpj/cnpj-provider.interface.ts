// Interface para dados de endereço do CNPJ
export interface CNPJEndereco {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
}

// Interface para sócio/administrador
export interface CNPJSocio {
    nome: string;
    qualificacao: string;
    cpfCnpj?: string;
    dataEntrada?: string;
    paisOrigem?: string;
    representanteLegal?: {
        nome: string;
        qualificacao: string;
    };
}

// Interface para atividade econômica (CNAE)
export interface CNPJAtividade {
    codigo: string;
    descricao: string;
}

// Interface para dados completos do CNPJ
export interface CNPJData {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    situacao: string; // ATIVA, BAIXADA, INAPTA, SUSPENSA, etc.
    dataSituacao?: string;
    motivoSituacao?: string;
    dataAbertura: string;
    naturezaJuridica: string;
    capitalSocial: number;
    porte: string; // MEI, ME, EPP, DEMAIS
    endereco: CNPJEndereco;
    atividadePrincipal: CNPJAtividade;
    atividadesSecundarias: CNPJAtividade[];
    telefone?: string;
    email?: string;
    socios: CNPJSocio[];
    // Campos adicionais
    inscricaoEstadual?: string;
    inscricaoMunicipal?: string;
    efr?: string; // Ente Federativo Responsável
    optanteMEI?: boolean;
    optanteSimples?: boolean;
    dataOpcaoSimples?: string;
    dataExclusaoSimples?: string;
}

// Resultado da validação de CNPJ
export interface CNPJValidationResult {
    isValid: boolean;
    data?: CNPJData;
    error?: string;
    source: string; // Nome do provider que fez a validação
    timestamp: Date;
    rawResponse?: Record<string, unknown>; // Resposta bruta da API para debug/auditoria
}

// Interface que todos os providers de CNPJ devem implementar
export interface ICNPJProvider {
    /** Nome único do provider */
    readonly name: string;

    /** Prioridade do provider (menor = maior prioridade) */
    readonly priority: number;

    /**
     * Valida um CNPJ e retorna os dados da empresa
     * @param cnpj CNPJ formatado ou não (apenas números)
     */
    validate(cnpj: string): Promise<CNPJValidationResult>;

    /**
     * Verifica se o provider está disponível/configurado
     */
    isAvailable(): Promise<boolean>;
}

// Token de injeção para os providers
export const CNPJ_PROVIDERS = 'CNPJ_PROVIDERS';
