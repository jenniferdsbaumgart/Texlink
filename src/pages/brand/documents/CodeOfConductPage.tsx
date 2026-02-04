import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  Download,
  Settings,
  History,
  Users,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import {
  brandDocumentsService,
  type BrandDocument,
} from '../../../services/brandDocuments.service';

export const CodeOfConductPage: React.FC = () => {
  const navigate = useNavigate();
  const [document, setDocument] = useState<BrandDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  // Form state
  const [title, setTitle] = useState('Código de Conduta do Fornecedor');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [requiresReacceptance, setRequiresReacceptance] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocument = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await brandDocumentsService.getDocuments({
        type: 'CODE_OF_CONDUCT',
        status: 'ACTIVE',
        limit: 1,
      });
      if (response.data.length > 0) {
        const doc = response.data[0];
        setDocument(doc);
        setTitle(doc.title);
        setDescription(doc.description || '');
        setIsRequired(doc.isRequired);
        setRequiresReacceptance(doc.requiresReacceptance);
      }
    } catch (err) {
      setError('Erro ao carregar documento');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Apenas arquivos PDF são permitidos');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Selecione um arquivo PDF');
      return;
    }

    setIsUploading(true);
    try {
      if (document) {
        // Update existing document
        await brandDocumentsService.updateDocument(document.id, selectedFile, {
          title,
          description,
          isRequired,
          requiresReacceptance,
        });
      } else {
        // Upload new document
        await brandDocumentsService.uploadDocument(selectedFile, {
          type: 'CODE_OF_CONDUCT',
          title,
          description,
          isRequired,
          requiresReacceptance,
        });
      }
      setSelectedFile(null);
      fetchDocument();
    } catch (err) {
      console.error('Erro ao enviar documento:', err);
      alert('Erro ao enviar documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!document) return;

    setIsUploading(true);
    try {
      await brandDocumentsService.updateDocument(document.id, undefined, {
        title,
        description,
        isRequired,
        requiresReacceptance,
      });
      fetchDocument();
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      alert('Erro ao salvar configurações');
    } finally {
      setIsUploading(false);
    }
  };

  const handleArchive = async () => {
    if (!document) return;
    if (!window.confirm('Deseja arquivar este documento? Os fornecedores não precisarão mais aceitá-lo.')) {
      return;
    }

    try {
      await brandDocumentsService.archiveDocument(document.id);
      setDocument(null);
      setSelectedFile(null);
    } catch (err) {
      console.error('Erro ao arquivar:', err);
      alert('Erro ao arquivar documento');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
            <FileText className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Código de Conduta
          </h1>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Gerencie o Código de Conduta que suas facções parceiras devem aceitar
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Current Document Section */}
        {document ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {document.title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Versão {document.version} • Publicado em {formatDate(document.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                  Ativo
                </span>
              </div>
            </div>

            {document.description && (
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {document.description}
              </p>
            )}

            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {document.fileName}
              </span>
              <span>{formatFileSize(document.fileSize)}</span>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {document._count?.acceptances || 0} aceites
              </span>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <a
                href={document.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Visualizar
              </a>
              <a
                href={document.fileUrl}
                download={document.fileName}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/brand/documentos/codigo-conduta/relatorio`)}
              >
                <Users className="w-4 h-4" />
                Ver Relatório de Aceites
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhum Código de Conduta Ativo
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Faça upload do seu Código de Conduta para que suas facções parceiras possam aceitar
            </p>
          </div>
        )}

        {/* Upload / Update Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {document ? 'Atualizar Documento' : 'Enviar Novo Documento'}
          </h3>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Título do Documento
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Ex: Código de Conduta do Fornecedor 2024"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                placeholder="Breve descrição do documento..."
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Arquivo PDF
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-brand-400 dark:hover:border-brand-500 transition-colors">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Clique para selecionar ou arraste um PDF
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Apenas arquivos PDF
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {document ? 'Atualizar Documento' : 'Enviar Documento'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Settings Section */}
        {document && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações
            </h3>

            <div className="space-y-4">
              {/* Is Required Toggle */}
              <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Obrigatório para Parcerias
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Fornecedores devem aceitar para iniciar parceria
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600" />
                </div>
              </label>

              {/* Requires Reacceptance Toggle */}
              <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Exigir Novo Aceite em Atualizações
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Fornecedores precisam aceitar novamente após cada atualização
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={requiresReacceptance}
                    onChange={(e) => setRequiresReacceptance(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600" />
                </div>
              </label>

              <div className="flex items-center gap-3 pt-4">
                <Button variant="primary" onClick={handleSaveSettings} disabled={isUploading}>
                  Salvar Configurações
                </Button>
                <Button
                  variant="outline"
                  onClick={handleArchive}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Arquivar Documento
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Version History Section */}
        {document && document.versions && document.versions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5" />
                Histórico de Versões ({document.versions.length})
              </h3>
              {showVersions ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {showVersions && (
              <div className="px-6 pb-6 space-y-3">
                {document.versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Versão {version.version}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {version.fileName} • {formatFileSize(version.fileSize)} •{' '}
                        {formatDate(version.createdAt)}
                      </p>
                      {version.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {version.notes}
                        </p>
                      )}
                    </div>
                    <a
                      href={version.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeOfConductPage;
