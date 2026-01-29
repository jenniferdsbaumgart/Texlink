import React, { useState } from 'react';
import { X, CheckCircle, XCircle, FileText, ExternalLink } from 'lucide-react';

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
  cnpj: string;
  contactName?: string;
  contactEmail?: string;
}

interface DocumentReviewModalProps {
  document: OnboardingDocument;
  credential: SupplierCredential;
  onClose: () => void;
  onValidate: (isValid: boolean, notes?: string) => Promise<void>;
}

/**
 * Modal para revisar e validar documento individual
 */
export function DocumentReviewModal({
  document,
  credential,
  onClose,
  onValidate,
}: DocumentReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!action) return;

    if (action === 'reject' && !notes.trim()) {
      alert('Por favor, informe o motivo da rejeição');
      return;
    }

    setIsSubmitting(true);
    try {
      await onValidate(action === 'approve', notes.trim() || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullUrl = document.fileUrl.startsWith('http')
    ? document.fileUrl
    : `${window.location.origin}${document.fileUrl}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Revisão de Documento
            </h2>
            <p className="text-sm text-gray-600">
              {credential.tradeName} • CNPJ: {credential.cnpj}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Informações do Documento */}
          <div className="mb-6">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {document.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">{document.fileName}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{(document.fileSize / 1024).toFixed(1)} KB</span>
                  <span>•</span>
                  <span>
                    Enviado em{' '}
                    {new Date(document.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                Abrir
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Preview do PDF */}
          <div className="mb-6">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <iframe
                src={fullUrl}
                className="w-full"
                style={{ height: '400px' }}
                title={document.name}
              />
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Se o documento não carregar, clique em "Abrir" para visualizar em nova aba
            </p>
          </div>

          {/* Ações de Validação */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Validação</h4>

            {/* Botões de Ação */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAction('approve')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  action === 'approve'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <CheckCircle
                  className={`w-6 h-6 mx-auto mb-2 ${
                    action === 'approve' ? 'text-green-600' : 'text-gray-400'
                  }`}
                />
                <p
                  className={`font-semibold ${
                    action === 'approve' ? 'text-green-900' : 'text-gray-700'
                  }`}
                >
                  Aprovar
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Documento está correto
                </p>
              </button>

              <button
                onClick={() => setAction('reject')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  action === 'reject'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <XCircle
                  className={`w-6 h-6 mx-auto mb-2 ${
                    action === 'reject' ? 'text-red-600' : 'text-gray-400'
                  }`}
                />
                <p
                  className={`font-semibold ${
                    action === 'reject' ? 'text-red-900' : 'text-gray-700'
                  }`}
                >
                  Rejeitar
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Documento precisa correção
                </p>
              </button>
            </div>

            {/* Campo de Notas */}
            {action && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {action === 'approve' ? 'Observações (opcional)' : 'Motivo da rejeição *'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    action === 'approve'
                      ? 'Adicione observações se necessário...'
                      : 'Explique o motivo da rejeição para o fornecedor...'
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={action === 'reject'}
                />
                {action === 'reject' && (
                  <p className="text-xs text-gray-500 mt-1">
                    O fornecedor verá esta mensagem e poderá reenviar o documento
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!action || isSubmitting || (action === 'reject' && !notes.trim())}
            className={`px-6 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              action === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : action === 'reject'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-400'
            }`}
          >
            {isSubmitting
              ? 'Salvando...'
              : action === 'approve'
              ? 'Aprovar Documento'
              : action === 'reject'
              ? 'Rejeitar Documento'
              : 'Selecione uma ação'}
          </button>
        </div>
      </div>
    </div>
  );
}
