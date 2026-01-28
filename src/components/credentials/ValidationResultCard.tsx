import React from 'react';
import { CheckCircle, XCircle, Building2, MapPin, Calendar, FileText } from 'lucide-react';

interface CredentialValidation {
  id: string;
  isValid: boolean | null;
  source: string;
  validatedAt: string | Date | null;

  // Company data from validation
  companyStatus?: string;
  companyType?: string;
  mainActivity?: string;
  foundedAt?: string | Date;
  capitalStock?: number;

  // Parsed data (can include more details)
  parsedData?: {
    razaoSocial?: string;
    nomeFantasia?: string;
    endereco?: {
      logradouro?: string;
      numero?: string;
      complemento?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
      cep?: string;
    };
    situacaoCadastral?: string;
  };

  errorMessage?: string;
}

interface ValidationResultCardProps {
  validation: CredentialValidation;
  className?: string;
}

const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const formatAddress = (endereco?: {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}): string => {
  if (!endereco) return 'Endereço não disponível';

  const parts = [
    endereco.logradouro,
    endereco.numero,
    endereco.complemento,
  ].filter(Boolean);

  const street = parts.join(', ');
  const location = [endereco.bairro, endereco.cidade, endereco.estado].filter(Boolean).join(' - ');

  return [street, location, endereco.cep].filter(Boolean).join('\n');
};

const getSourceLabel = (source: string): string => {
  const sourceMap: Record<string, string> = {
    RECEITA_FEDERAL: 'Receita Federal',
    SINTEGRA: 'Sintegra',
    SERASA: 'Serasa',
    SPC: 'SPC Brasil',
    INTERNAL: 'Validação Interna',
  };
  return sourceMap[source] || source;
};

export const ValidationResultCard: React.FC<ValidationResultCardProps> = ({
  validation,
  className = '',
}) => {
  const isValid = validation.isValid === true;
  const isFailed = validation.isValid === false;
  const isPending = validation.isValid === null;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`
              p-3 rounded-xl
              ${isValid
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : isFailed
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }
            `}
          >
            {isValid ? (
              <CheckCircle className="h-6 w-6" />
            ) : isFailed ? (
              <XCircle className="h-6 w-6" />
            ) : (
              <Building2 className="h-6 w-6" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isValid ? 'Validação Aprovada' : isFailed ? 'Validação Reprovada' : 'Validação Pendente'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Fonte: {getSourceLabel(validation.source)}
            </p>
          </div>
        </div>

        {validation.validatedAt && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(validation.validatedAt)}</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {isFailed && validation.errorMessage && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{validation.errorMessage}</p>
        </div>
      )}

      {/* Company data */}
      {validation.parsedData && isValid && (
        <div className="space-y-4">
          {/* Legal and trade names */}
          {(validation.parsedData.razaoSocial || validation.parsedData.nomeFantasia) && (
            <div>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div className="flex-1">
                  {validation.parsedData.razaoSocial && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Razão Social</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {validation.parsedData.razaoSocial}
                      </p>
                    </div>
                  )}
                  {validation.parsedData.nomeFantasia && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Nome Fantasia</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {validation.parsedData.nomeFantasia}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          {validation.parsedData.endereco && (
            <div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Endereço</p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">
                    {formatAddress(validation.parsedData.endereco)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fiscal status */}
          {(validation.parsedData.situacaoCadastral || validation.companyStatus) && (
            <div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Status Fiscal</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {validation.parsedData.situacaoCadastral || validation.companyStatus}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Founded date and capital */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {validation.foundedAt && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data de Abertura</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(validation.foundedAt)}
                </p>
              </div>
            )}
            {validation.capitalStock && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Capital Social</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(validation.capitalStock)}
                </p>
              </div>
            )}
          </div>

          {/* Company type and main activity */}
          {(validation.companyType || validation.mainActivity) && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              {validation.companyType && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Natureza Jurídica</p>
                  <p className="text-sm text-gray-900 dark:text-white">{validation.companyType}</p>
                </div>
              )}
              {validation.mainActivity && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Atividade Principal</p>
                  <p className="text-sm text-gray-900 dark:text-white">{validation.mainActivity}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pending state */}
      {isPending && !validation.errorMessage && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
            <Building2 className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Validação em andamento...</p>
        </div>
      )}
    </div>
  );
};

export default ValidationResultCard;
