import React, { useState, useEffect } from 'react';
import { FileCheck, AlertCircle, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { DocumentReviewModal } from './DocumentReviewModal';
import { useToast } from '../../../contexts/ToastContext';

interface OnboardingDocument {
  id: string;
  type: string;
  name: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isValid?: boolean | null;
  validationNotes?: string | null;
  validatedAt?: string | null;
  createdAt: string;
}

interface SupplierCredential {
  id: string;
  tradeName: string;
  legalName?: string;
  cnpj: string;
  contactName?: string;
  contactEmail?: string;
  status: string;
  onboarding?: {
    id: string;
    currentStep: number;
    documents: OnboardingDocument[];
  };
}

/**
 * Dashboard de Validação de Documentos
 *
 * Permite que a marca visualize e valide documentos
 * enviados pelos fornecedores durante o onboarding.
 */
export function DocumentValidationPage() {
  const toast = useToast();
  const [credentials, setCredentials] = useState<SupplierCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<OnboardingDocument | null>(null);
  const [selectedCredential, setSelectedCredential] = useState<SupplierCredential | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setIsLoading(true);
      setError('');

      // TODO: Integrar com API real
      // const response = await credentialsService.getCredentialsWithPendingDocuments();

      // Mock data
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockData: SupplierCredential[] = [
        {
          id: 'cred-001',
          tradeName: 'Facção Exemplo 1',
          legalName: 'Facção Exemplo 1 Ltda',
          cnpj: '12.345.678/0001-90',
          contactName: 'João Silva',
          contactEmail: 'joao@faccao1.com',
          status: 'ONBOARDING_IN_PROGRESS',
          onboarding: {
            id: 'onb-001',
            currentStep: 4,
            documents: [
              {
                id: 'doc-001',
                type: 'alvara_funcionamento',
                name: 'Alvará de Funcionamento',
                fileName: 'alvara-2024.pdf',
                fileUrl: '/uploads/onboarding/cred-001/alvara-2024.pdf',
                fileSize: 245000,
                mimeType: 'application/pdf',
                isValid: null,
                createdAt: new Date().toISOString(),
              },
              {
                id: 'doc-002',
                type: 'certificado_bombeiros',
                name: 'Certificado do Corpo de Bombeiros',
                fileName: 'bombeiros-2024.pdf',
                fileUrl: '/uploads/onboarding/cred-001/bombeiros-2024.pdf',
                fileSize: 180000,
                mimeType: 'application/pdf',
                isValid: null,
                createdAt: new Date().toISOString(),
              },
              {
                id: 'doc-003',
                type: 'certidao_fiscal',
                name: 'Certidão Fiscal',
                fileName: 'fiscal-2024.pdf',
                fileUrl: '/uploads/onboarding/cred-001/fiscal-2024.pdf',
                fileSize: 120000,
                mimeType: 'application/pdf',
                isValid: true,
                validatedAt: new Date(Date.now() - 86400000).toISOString(),
                createdAt: new Date(Date.now() - 172800000).toISOString(),
              },
            ],
          },
        },
        {
          id: 'cred-002',
          tradeName: 'Facção Exemplo 2',
          cnpj: '98.765.432/0001-10',
          contactName: 'Maria Santos',
          contactEmail: 'maria@faccao2.com',
          status: 'ONBOARDING_IN_PROGRESS',
          onboarding: {
            id: 'onb-002',
            currentStep: 4,
            documents: [
              {
                id: 'doc-004',
                type: 'alvara_funcionamento',
                name: 'Alvará de Funcionamento',
                fileName: 'alvara.pdf',
                fileUrl: '/uploads/onboarding/cred-002/alvara.pdf',
                fileSize: 320000,
                mimeType: 'application/pdf',
                isValid: null,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        },
      ];

      setCredentials(mockData);
    } catch (err: any) {
      console.error('Erro ao carregar credenciais:', err);
      setError('Erro ao carregar credenciais com documentos pendentes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async (
    credentialId: string,
    documentId: string,
    isValid: boolean,
    notes?: string
  ) => {
    try {
      // TODO: Integrar com API real
      // await credentialsService.validateDocument(credentialId, documentId, { isValid, validationNotes: notes });

      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Atualizar estado local
      setCredentials(prev =>
        prev.map(cred => {
          if (cred.id === credentialId && cred.onboarding) {
            return {
              ...cred,
              onboarding: {
                ...cred.onboarding,
                documents: cred.onboarding.documents.map(doc =>
                  doc.id === documentId
                    ? {
                        ...doc,
                        isValid,
                        validationNotes: notes || null,
                        validatedAt: new Date().toISOString(),
                      }
                    : doc
                ),
              },
            };
          }
          return cred;
        })
      );

      // Fechar modal
      setSelectedDocument(null);
      setSelectedCredential(null);

      // Notificar
      if (isValid) {
        toast.success(
          'Documento aprovado',
          `O documento foi aprovado. O fornecedor será notificado.`
        );
      } else {
        toast.info(
          'Documento rejeitado',
          `O fornecedor foi notificado e poderá reenviar o documento.`
        );
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Erro ao validar documento';
      setError(errorMsg);
      toast.error('Erro na validação', errorMsg);
    }
  };

  // Filtrar credenciais
  const filteredCredentials = credentials.filter(cred => {
    if (!cred.onboarding?.documents) return false;

    const hasPending = cred.onboarding.documents.some(doc => doc.isValid === null);
    const hasApproved = cred.onboarding.documents.some(doc => doc.isValid === true);
    const hasRejected = cred.onboarding.documents.some(doc => doc.isValid === false);

    if (filter === 'pending') return hasPending;
    if (filter === 'approved') return hasApproved;
    if (filter === 'rejected') return hasRejected;
    return true;
  });

  // Estatísticas
  const stats = {
    total: credentials.reduce((acc, c) => acc + (c.onboarding?.documents.length || 0), 0),
    pending: credentials.reduce(
      (acc, c) => acc + (c.onboarding?.documents.filter(d => d.isValid === null).length || 0),
      0
    ),
    approved: credentials.reduce(
      (acc, c) => acc + (c.onboarding?.documents.filter(d => d.isValid === true).length || 0),
      0
    ),
    rejected: credentials.reduce(
      (acc, c) => acc + (c.onboarding?.documents.filter(d => d.isValid === false).length || 0),
      0
    ),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Validação de Documentos
        </h1>
        <p className="text-gray-600">
          Revise e aprove documentos enviados pelos fornecedores
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FileCheck}
          label="Total"
          value={stats.total}
          color="gray"
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <StatCard
          icon={AlertCircle}
          label="Pendentes"
          value={stats.pending}
          color="yellow"
          active={filter === 'pending'}
          onClick={() => setFilter('pending')}
        />
        <StatCard
          icon={CheckCircle}
          label="Aprovados"
          value={stats.approved}
          color="green"
          active={filter === 'approved'}
          onClick={() => setFilter('approved')}
        />
        <StatCard
          icon={XCircle}
          label="Rejeitados"
          value={stats.rejected}
          color="red"
          active={filter === 'rejected'}
          onClick={() => setFilter('rejected')}
        />
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Lista de Credenciais */}
      {filteredCredentials.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum documento encontrado
          </h3>
          <p className="text-gray-600">
            {filter === 'pending'
              ? 'Não há documentos pendentes de validação'
              : 'Tente ajustar os filtros ou aguarde novos uploads'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCredentials.map(credential => (
            <CredentialDocumentsCard
              key={credential.id}
              credential={credential}
              onReviewDocument={(doc) => {
                setSelectedDocument(doc);
                setSelectedCredential(credential);
              }}
            />
          ))}
        </div>
      )}

      {/* Modal de Revisão */}
      {selectedDocument && selectedCredential && (
        <DocumentReviewModal
          document={selectedDocument}
          credential={selectedCredential}
          onClose={() => {
            setSelectedDocument(null);
            setSelectedCredential(null);
          }}
          onValidate={(isValid, notes) =>
            handleValidate(selectedCredential.id, selectedDocument.id, isValid, notes)
          }
        />
      )}
    </div>
  );
}

// ==================== COMPONENTES AUXILIARES ====================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'gray' | 'yellow' | 'green' | 'red';
  active: boolean;
  onClick: () => void;
}

function StatCard({ icon: Icon, label, value, color, active, onClick }: StatCardProps) {
  const colorClasses = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };

  const activeClasses = {
    gray: 'ring-2 ring-gray-500',
    yellow: 'ring-2 ring-yellow-500',
    green: 'ring-2 ring-green-500',
    red: 'ring-2 ring-red-500',
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all hover:shadow-md ${colorClasses[color]} ${
        active ? activeClasses[color] : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="w-8 h-8 opacity-60" />
      </div>
    </button>
  );
}

interface CredentialDocumentsCardProps {
  credential: SupplierCredential;
  onReviewDocument: (doc: OnboardingDocument) => void;
}

function CredentialDocumentsCard({
  credential,
  onReviewDocument,
}: CredentialDocumentsCardProps) {
  if (!credential.onboarding?.documents) return null;

  const pendingCount = credential.onboarding.documents.filter(
    d => d.isValid === null
  ).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Header do Fornecedor */}
      <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {credential.tradeName}
          </h3>
          <p className="text-sm text-gray-600">CNPJ: {credential.cnpj}</p>
          {credential.contactName && (
            <p className="text-sm text-gray-600">
              Contato: {credential.contactName} • {credential.contactEmail}
            </p>
          )}
        </div>
        {pendingCount > 0 && (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Lista de Documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {credential.onboarding.documents.map(doc => (
          <DocumentMiniCard
            key={doc.id}
            document={doc}
            onReview={() => onReviewDocument(doc)}
          />
        ))}
      </div>
    </div>
  );
}

interface DocumentMiniCardProps {
  document: OnboardingDocument;
  onReview: () => void;
}

function DocumentMiniCard({ document, onReview }: DocumentMiniCardProps) {
  const getStatusBadge = () => {
    if (document.isValid === true) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Aprovado
        </span>
      );
    }
    if (document.isValid === false) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Rejeitado
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Pendente
      </span>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm truncate">
            {document.name}
          </h4>
          <p className="text-xs text-gray-500 truncate">{document.fileName}</p>
        </div>
        {getStatusBadge()}
      </div>

      <button
        onClick={onReview}
        className="w-full mt-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
      >
        <Eye className="w-4 h-4" />
        Revisar
      </button>
    </div>
  );
}
