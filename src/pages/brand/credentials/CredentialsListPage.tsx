import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Loader2, FileX, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { credentialsService } from '../../../services';
import type { SupplierCredential, CredentialFilters, SupplierCredentialStatus, CredentialCategory } from '../../../types/credentials';
import { CredentialCard } from '../../../components/credentials/CredentialCard';

const CredentialsListPage: React.FC = () => {
    const [credentials, setCredentials] = useState<SupplierCredential[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<CredentialFilters>({
        page: 1,
        limit: 20,
    });
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        active: 0,
        rejected: 0,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<SupplierCredentialStatus | ''>('');
    const [selectedCategory, setSelectedCategory] = useState<CredentialCategory | ''>('');
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        loadCredentials();
        loadStats();
    }, [filters]);

    const loadCredentials = async () => {
        try {
            setIsLoading(true);
            const response = await credentialsService.list(filters);
            setCredentials(response.data);
            setTotalPages(response.meta.totalPages);
        } catch (error) {
            console.error('Error loading credentials:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const data = await credentialsService.getStats();
            setStats({
                total: data.total,
                pending: data.pendingAction,
                active: data.activeCount,
                rejected: data.byStatus['COMPLIANCE_REJECTED'] || 0,
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const handleSearch = () => {
        setFilters((prev) => ({
            ...prev,
            search: searchTerm || undefined,
            page: 1,
        }));
    };

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status as SupplierCredentialStatus);
        setFilters((prev) => ({
            ...prev,
            status: status ? (status as SupplierCredentialStatus) : undefined,
            page: 1,
        }));
    };

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category as CredentialCategory);
        setFilters((prev) => ({
            ...prev,
            category: category ? (category as CredentialCategory) : undefined,
            page: 1,
        }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters((prev) => ({
            ...prev,
            page: newPage,
        }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const StatCard = ({ icon: Icon, label, value, color }: any) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Credenciamento de Facções
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Gerencie todo o processo de credenciamento de fornecedores
                    </p>
                </div>
                <Link
                    to="/brand/credenciamento/novo"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Novo Credenciamento
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Users}
                    label="Total"
                    value={stats.total}
                    color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                />
                <StatCard
                    icon={Clock}
                    label="Pendentes"
                    value={stats.pending}
                    color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Ativos"
                    value={stats.active}
                    color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                />
                <StatCard
                    icon={XCircle}
                    label="Rejeitados"
                    value={stats.rejected}
                    color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                />
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, CNPJ, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative w-full lg:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <select
                            value={selectedStatus}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Todos os status</option>
                            <option value="DRAFT">Rascunho</option>
                            <option value="VALIDATING">Validando</option>
                            <option value="VALIDATION_FAILED">Validação Falhou</option>
                            <option value="COMPLIANCE_APPROVED">Compliance Aprovado</option>
                            <option value="COMPLIANCE_REJECTED">Compliance Rejeitado</option>
                            <option value="INVITATION_SENT">Convite Enviado</option>
                            <option value="INVITATION_OPENED">Convite Aberto</option>
                            <option value="ONBOARDING_IN_PROGRESS">Onboarding</option>
                            <option value="ACTIVE">Ativo</option>
                        </select>
                    </div>

                    {/* Category Filter */}
                    <div className="relative w-full lg:w-48">
                        <select
                            value={selectedCategory}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                            <option value="">Todas categorias</option>
                            <option value="CONFECCAO">Confecção</option>
                            <option value="BORDADO">Bordado</option>
                            <option value="ESTAMPARIA">Estamparia</option>
                            <option value="LAVANDERIA">Lavanderia</option>
                            <option value="MALHARIA">Malharia</option>
                            <option value="COSTURA">Costura</option>
                            <option value="OUTRO">Outro</option>
                        </select>
                    </div>

                    {/* Search Button */}
                    <button
                        onClick={handleSearch}
                        className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                    >
                        Buscar
                    </button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
            ) : credentials.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <FileX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Nenhum credenciamento encontrado
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {filters.search || filters.status || filters.category
                            ? 'Tente ajustar os filtros de busca'
                            : 'Comece criando seu primeiro credenciamento'}
                    </p>
                    {!filters.search && !filters.status && !filters.category && (
                        <Link
                            to="/brand/credenciamento/novo"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Novo Credenciamento
                        </Link>
                    )}
                </div>
            ) : (
                <>
                    {/* Credentials Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {credentials.map((credential) => (
                            <CredentialCard
                                key={credential.id}
                                credential={credential}
                                onClick={() => {
                                    window.location.href = `/brand/credenciamento/${credential.id}`;
                                }}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Página {filters.page} de {totalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePageChange((filters.page || 1) - 1)}
                                    disabled={filters.page === 1}
                                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => handlePageChange((filters.page || 1) + 1)}
                                    disabled={filters.page === totalPages}
                                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CredentialsListPage;
