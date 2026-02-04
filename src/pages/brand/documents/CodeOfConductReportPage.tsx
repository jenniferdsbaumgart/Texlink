import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Users,
  CheckCircle,
  Clock,
  Bell,
  Download,
  ArrowLeft,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import {
  brandDocumentsService,
  type AcceptanceReport,
} from '../../../services/brandDocuments.service';

type FilterStatus = 'all' | 'accepted' | 'pending';

export const CodeOfConductReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<AcceptanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // First get the active document
      const docsResponse = await brandDocumentsService.getDocuments({
        type: 'CODE_OF_CONDUCT',
        status: 'ACTIVE',
        limit: 1,
      });

      if (docsResponse.data.length === 0) {
        setError('Nenhum Código de Conduta ativo encontrado');
        setIsLoading(false);
        return;
      }

      const doc = docsResponse.data[0];
      const reportData = await brandDocumentsService.getAcceptanceReport(doc.id);
      setReport(reportData);
    } catch (err) {
      setError('Erro ao carregar relatório');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSendReminders = async () => {
    if (!report) return;
    if (!window.confirm(`Deseja enviar lembretes para ${report.pendingCount} fornecedores pendentes?`)) {
      return;
    }

    setIsSendingReminders(true);
    try {
      const result = await brandDocumentsService.sendReminders(report.document.id);
      alert(`${result.remindersSent} lembretes enviados com sucesso!`);
      fetchReport();
    } catch (err) {
      console.error('Erro ao enviar lembretes:', err);
      alert('Erro ao enviar lembretes');
    } finally {
      setIsSendingReminders(false);
    }
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Filter data based on status and search
  const filteredAcceptances =
    report?.acceptances.filter((a) =>
      a.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.acceptedByName.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const filteredPending =
    report?.pendingSuppliers.filter((s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => navigate('/brand/documentos/codigo-conduta')} className="mb-6">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {error || 'Nenhum documento encontrado'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Faça upload de um Código de Conduta primeiro
          </p>
        </div>
      </div>
    );
  }

  const acceptanceRate =
    report.totalSuppliers > 0
      ? Math.round((report.acceptedCount / report.totalSuppliers) * 100)
      : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/brand/documentos/codigo-conduta')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Código de Conduta
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-brand-500" />
              Relatório de Aceites
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {report.document.title} • Versão {report.document.version}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={report.document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver Documento
            </a>
            {report.pendingCount > 0 && (
              <Button
                variant="primary"
                onClick={handleSendReminders}
                disabled={isSendingReminders}
              >
                {isSendingReminders ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    Enviar Lembretes ({report.pendingCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Fornecedores</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {report.totalSuppliers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aceitos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {report.acceptedCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {report.pendingCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Taxa de Aceite</p>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                {acceptanceRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progresso de Aceites
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {report.acceptedCount} de {report.totalSuppliers}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-500"
            style={{ width: `${acceptanceRate}%` }}
          />
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'all'
                  ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Todos ({report.totalSuppliers})
            </button>
            <button
              onClick={() => setFilterStatus('accepted')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'accepted'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Aceitos ({report.acceptedCount})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Pendentes ({report.pendingCount})
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Accepted List */}
      {(filterStatus === 'all' || filterStatus === 'accepted') &&
        filteredAcceptances.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Aceitos
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fornecedor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Aceito por
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Versão
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data/Hora
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAcceptances.map((acceptance) => (
                    <tr key={acceptance.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {acceptance.supplier.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-gray-900 dark:text-white">
                            {acceptance.acceptedByName}
                          </span>
                          {acceptance.acceptedByRole && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                              ({acceptance.acceptedByRole})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                          v{acceptance.acceptedVersion}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(acceptance.acceptedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Pending List */}
      {(filterStatus === 'all' || filterStatus === 'pending') &&
        filteredPending.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Pendentes
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fornecedor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPending.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {supplier.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                          <Clock className="w-3 h-3" />
                          Aguardando aceite
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Empty States */}
      {filterStatus === 'accepted' && filteredAcceptances.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <CheckCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum aceite encontrado
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Nenhum resultado para sua busca' : 'Nenhum fornecedor aceitou ainda'}
          </p>
        </div>
      )}

      {filterStatus === 'pending' && filteredPending.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <CheckCircle className="w-12 h-12 text-green-300 dark:text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Todos aceitaram!
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm
              ? 'Nenhum resultado para sua busca'
              : 'Todos os fornecedores já aceitaram o Código de Conduta'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CodeOfConductReportPage;
