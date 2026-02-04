import React, { useState } from 'react';
import { X, FileText, Download, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  brandDocumentsService,
  type BrandDocument,
} from '../../services/brandDocuments.service';

interface AcceptCodeOfConductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccepted: () => void;
  document: BrandDocument;
  relationshipId: string;
  brandName: string;
}

export const AcceptCodeOfConductModal: React.FC<AcceptCodeOfConductModalProps> = ({
  isOpen,
  onClose,
  onAccepted,
  document,
  relationshipId,
  brandName,
}) => {
  const [acceptedByName, setAcceptedByName] = useState('');
  const [acceptedByRole, setAcceptedByRole] = useState('');
  const [checkboxConfirmed, setCheckboxConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!acceptedByName.trim()) {
      setError('Nome do responsável é obrigatório');
      return;
    }

    if (!checkboxConfirmed) {
      setError('Você deve confirmar que leu e aceita o documento');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await brandDocumentsService.acceptDocument({
        documentId: document.id,
        relationshipId,
        checkboxConfirmed,
        acceptedByName: acceptedByName.trim(),
        acceptedByRole: acceptedByRole.trim() || undefined,
      });

      onAccepted();
      onClose();
    } catch (err) {
      console.error('Erro ao aceitar documento:', err);
      setError('Erro ao registrar aceite. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg transform transition-all">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-brand-50 dark:bg-brand-900/20 rounded-t-xl">
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-800 flex items-center justify-center">
              <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Aceitar Código de Conduta
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {brandName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Document Info */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                {document.title}
              </h3>
              {document.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {document.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {document.fileName}
                </span>
                <span>{formatFileSize(document.fileSize)}</span>
                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                  v{document.version}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Visualizar PDF
                </a>
                <a
                  href={document.fileUrl}
                  download={document.fileName}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </a>
              </div>
            </div>

            {/* Required indicator */}
            {document.isRequired && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Este documento é <strong>obrigatório</strong> para a parceria com {brandName}.
                </p>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Responsável <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={acceptedByName}
                  onChange={(e) => setAcceptedByName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cargo (opcional)
                </label>
                <input
                  type="text"
                  value={acceptedByRole}
                  onChange={(e) => setAcceptedByRole(e.target.value)}
                  placeholder="Ex: Proprietário, Gerente, etc."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Consent Checkbox */}
            <label className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={checkboxConfirmed}
                onChange={(e) => setCheckboxConfirmed(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Li e aceito integralmente</strong> o Código de Conduta da marca{' '}
                <strong>{brandName}</strong>. Comprometo-me a cumprir todas as diretrizes
                e padrões estabelecidos neste documento.
              </span>
            </label>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleAccept}
              disabled={isLoading || !checkboxConfirmed || !acceptedByName.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Aceitar Documento
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptCodeOfConductModal;
